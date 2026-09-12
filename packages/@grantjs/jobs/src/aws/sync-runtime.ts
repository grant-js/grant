import { ECSClient, RunTaskCommand } from '@aws-sdk/client-ecs';
import type { ILogger, ISyncRuntime, SyncRuntimeDispatch, SyncRuntimeStarted } from '@grantjs/core';
import { ConfigurationError } from '@grantjs/core';

export interface AwsSyncRuntimeConfig {
  region: string;
  clusterArn: string;
  taskDefinitionArn: string;
  /** Container in the task definition whose environment the overrides target. */
  containerName: string;
  /** Private-with-egress. Fargate pulls the image before the container exists. */
  subnetIds: string[];
  securityGroupIds: string[];
  /** Override for LocalStack or a VPC endpoint. */
  endpoint?: string;
}

/**
 * Runs `project-sync` as a Fargate task, per ADR 0002.
 *
 * The job id and scope travel as **container environment overrides**, not as a command
 * line: an ECS override is bounded at 8 KiB in total, and a CDM scope is small while a
 * CDM payload is not — so the task is told which `project_sync_jobs` row to load and
 * reads the document from the database itself. That also keeps the payload out of
 * CloudTrail, which records `RunTask` parameters.
 *
 * `RunTask` returns as soon as ECS accepts the task. Nothing here waits for the import:
 * a dispatcher that waited would inherit the 15-minute ceiling it exists to escape, and
 * the `project_sync_jobs` row is already the mechanism by which callers learn the
 * outcome.
 */
export class AwsSyncRuntime implements ISyncRuntime {
  private readonly client: ECSClient;

  constructor(
    private readonly config: AwsSyncRuntimeConfig,
    private readonly logger?: ILogger
  ) {
    if (!config.clusterArn || !config.taskDefinitionArn) {
      throw new ConfigurationError(
        'JOBS_SYNC_RUNTIME=container requires JOBS_SYNC_TASK_CLUSTER_ARN and ' +
          'JOBS_SYNC_TASK_DEFINITION_ARN. Without them the dispatcher would accept sync ' +
          'jobs and silently never run them.'
      );
    }
    if (config.subnetIds.length === 0) {
      throw new ConfigurationError(
        'JOBS_SYNC_RUNTIME=container requires JOBS_SYNC_TASK_SUBNET_IDS. A Fargate task ' +
          'with no subnet cannot be placed, and RunTask fails per invocation rather than ' +
          'at boot — so this is checked here, where it fails once and loudly.'
      );
    }

    this.client = new ECSClient({
      region: config.region,
      ...(config.endpoint ? { endpoint: config.endpoint } : {}),
    });
  }

  public async start(dispatch: SyncRuntimeDispatch): Promise<SyncRuntimeStarted> {
    const result = await this.client.send(
      new RunTaskCommand({
        cluster: this.config.clusterArn,
        taskDefinition: this.config.taskDefinitionArn,
        launchType: 'FARGATE',
        count: 1,
        networkConfiguration: {
          awsvpcConfiguration: {
            subnets: this.config.subnetIds,
            ...(this.config.securityGroupIds.length > 0
              ? { securityGroups: this.config.securityGroupIds }
              : {}),
            // Never ENABLED. The task reaches ECR and the database from
            // private-with-egress subnets through NAT; a public IP would put an
            // importer with database credentials on the internet.
            assignPublicIp: 'DISABLED',
          },
        },
        overrides: {
          containerOverrides: [
            {
              name: this.config.containerName,
              environment: [
                { name: 'GRANT_SYNC_JOB_ID', value: dispatch.jobRecordId },
                { name: 'GRANT_SYNC_JOB_SCOPE', value: JSON.stringify(dispatch.scope) },
              ],
            },
          ],
        },
      })
    );

    // ECS answers 200 with the rejection inside the body rather than throwing, so a
    // capacity or placement failure looks like success to anything that only checks for
    // an exception. The job would then sit in `RUNNING` forever with nothing running it.
    const failure = result.failures?.[0];
    if (failure) {
      throw new ConfigurationError(
        `ECS refused to start the sync task: ${failure.reason ?? 'unknown reason'}` +
          (failure.detail ? ` (${failure.detail})` : '')
      );
    }

    const reference = result.tasks?.[0]?.taskArn;
    if (!reference) {
      throw new ConfigurationError(
        'ECS accepted RunTask but returned no task. Treated as a failure: the sync job ' +
          'would otherwise be recorded as dispatched with nothing executing it.'
      );
    }

    this.logger?.info({
      msg: 'Dispatched project-sync to a container runtime',
      jobRecordId: dispatch.jobRecordId,
      taskArn: reference,
    });

    return { reference };
  }
}
