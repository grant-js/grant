/**
 * Runs the migrate task during `cdk deploy`, and waits for it.
 *
 * Waiting is the whole point. `ecs:RunTask` returns as soon as the task is accepted,
 * so a trigger that only starts it would let CloudFormation report success while the
 * schema is still mid-migration — and, in 4c, let the API begin serving against a
 * database that is not ready. This polls to a terminal state and fails the deploy on
 * a non-zero exit, so an unmigrated database stops the rollout instead of becoming a
 * runtime mystery.
 *
 * `Trigger` rather than a custom-resource provider: there is one thing to do, once,
 * during deployment, and `executeAfter` expresses the ordering that matters.
 */

import { Duration, RemovalPolicy, Stack } from 'aws-cdk-lib';
import type { ISecurityGroup, IVpc } from 'aws-cdk-lib/aws-ec2';
import { PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { Code, Function as LambdaFunction, Runtime } from 'aws-cdk-lib/aws-lambda';
import { LogGroup, RetentionDays } from 'aws-cdk-lib/aws-logs';
import { Trigger } from 'aws-cdk-lib/triggers';
import { Construct } from 'constructs';

import type { MigrateTask } from './migrate-task';

export interface MigrateTriggerProps {
  readonly vpc: IVpc;
  readonly task: MigrateTask;
  readonly securityGroups: ISecurityGroup[];

  /** Constructs that must exist before the migration runs — the proxy, the secret. */
  readonly executeAfter?: Construct[];

  /** Wall-clock ceiling for the migration. Lambda's own hard limit is 15 minutes. */
  readonly timeout?: Duration;

  /**
   * Identity of the image being deployed.
   *
   * Decides whether the migration runs again. `Trigger` re-executes when the handler
   * changes, and a changed environment variable is a changed handler — so threading
   * the image tag through means the migration re-runs exactly when the image differs.
   * That is the right condition rather than an approximation of it: migrations ship
   * inside the image, so an unchanged image cannot contain a migration that has not
   * already run, and a changed one might.
   */
  readonly imageIdentifier: string;
}

/**
 * Inline rather than a bundled asset: it has no dependencies beyond the AWS SDK the
 * Node runtime already ships, and inlining keeps the deployed behaviour visible in
 * the synthesized template instead of behind an asset hash.
 */
const RUNNER_SOURCE = `
const { ECSClient, RunTaskCommand, DescribeTasksCommand } = require('@aws-sdk/client-ecs');

const ecs = new ECSClient({});
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

exports.handler = async function handler() {
  const started = await ecs.send(new RunTaskCommand({
    cluster: process.env.CLUSTER_ARN,
    taskDefinition: process.env.TASK_DEFINITION_ARN,
    launchType: 'FARGATE',
    count: 1,
    networkConfiguration: {
      awsvpcConfiguration: {
        subnets: JSON.parse(process.env.SUBNET_IDS),
        securityGroups: JSON.parse(process.env.SECURITY_GROUP_IDS),
        assignPublicIp: 'DISABLED',
      },
    },
  }));

  const failure = started.failures && started.failures[0];
  if (failure) {
    throw new Error('Could not start the migrate task: ' + failure.reason + ' (' + failure.detail + ')');
  }

  const taskArn = started.tasks[0].taskArn;
  const deadline = Date.now() + Number(process.env.WAIT_TIMEOUT_MS);

  for (;;) {
    if (Date.now() > deadline) {
      throw new Error('Migration did not finish within the configured timeout: ' + taskArn);
    }
    await sleep(5000);

    const described = await ecs.send(new DescribeTasksCommand({
      cluster: process.env.CLUSTER_ARN,
      tasks: [taskArn],
    }));
    const task = described.tasks && described.tasks[0];
    if (!task || task.lastStatus !== 'STOPPED') continue;

    const container = (task.containers || [])[0] || {};
    if (container.exitCode === 0) return;

    // stoppedReason carries the useful text when the container never ran at all --
    // an image pull failure, for instance, where exitCode is undefined.
    throw new Error(
      'Migration failed: exitCode=' + container.exitCode +
      ' reason=' + (container.reason || task.stoppedReason || 'unknown')
    );
  }
};
`;

export class MigrateTrigger extends Construct {
  constructor(scope: Construct, id: string, props: MigrateTriggerProps) {
    super(scope, id);

    const timeout = props.timeout ?? Duration.minutes(15);
    const subnets = props.vpc.selectSubnets(props.task.subnetSelection);

    // Not VPC-attached: it calls the ECS control plane, which is a public API. Putting
    // it in the VPC would need an ECS interface endpoint to work at all, and buys
    // nothing — the task it starts is the thing that touches the database.
    const runner = new LambdaFunction(this, 'Runner', {
      runtime: Runtime.NODEJS_22_X,
      handler: 'index.handler',
      code: Code.fromInline(RUNNER_SOURCE),
      timeout,
      // An explicit group, not the deprecated `logRetention` prop. That prop creates a
      // CDK custom resource whose role holds `logs:PutRetentionPolicy` and
      // `logs:DeleteRetentionPolicy` on `*` — account-wide authority to reconfigure
      // any log group, granted to run one migration. An owned group needs neither.
      logGroup: new LogGroup(this, 'TriggerLogs', {
        retention: RetentionDays.TWO_WEEKS,
        removalPolicy: RemovalPolicy.DESTROY,
      }),
      environment: {
        CLUSTER_ARN: props.task.cluster.clusterArn,
        TASK_DEFINITION_ARN: props.task.taskDefinition.taskDefinitionArn,
        SUBNET_IDS: Stack.of(this).toJsonString(subnets.subnetIds),
        SECURITY_GROUP_IDS: Stack.of(this).toJsonString(
          props.securityGroups.map((group) => group.securityGroupId)
        ),
        WAIT_TIMEOUT_MS: String(timeout.toMilliseconds()),
        // Not read by the handler. It is here to change the function's configuration
        // when the image changes, which is what re-arms the trigger below.
        IMAGE_IDENTIFIER: props.imageIdentifier,
      },
    });

    // Scoped to this task definition and this cluster, not ecs:RunTask on "*".
    runner.addToRolePolicy(
      new PolicyStatement({
        actions: ['ecs:RunTask'],
        resources: [props.task.taskDefinition.taskDefinitionArn],
        conditions: { ArnEquals: { 'ecs:cluster': props.task.cluster.clusterArn } },
      })
    );

    // DescribeTasks does not accept the task definition as a resource — task ARNs are
    // only known after RunTask returns — so it is scoped by cluster instead.
    runner.addToRolePolicy(
      new PolicyStatement({
        actions: ['ecs:DescribeTasks'],
        resources: ['*'],
        conditions: { ArnEquals: { 'ecs:cluster': props.task.cluster.clusterArn } },
      })
    );

    // RunTask hands these roles to the task; without PassRole it is denied. Scoped to
    // exactly the two roles this task definition uses.
    const passableRoles = [props.task.taskDefinition.taskRole.roleArn];
    if (props.task.taskDefinition.executionRole) {
      passableRoles.push(props.task.taskDefinition.executionRole.roleArn);
    }
    runner.addToRolePolicy(
      new PolicyStatement({
        actions: ['iam:PassRole'],
        resources: passableRoles,
        conditions: { StringEquals: { 'iam:PassedToService': 'ecs-tasks.amazonaws.com' } },
      })
    );

    new Trigger(this, 'Trigger', {
      handler: runner,
      // Re-execute when the handler changes, which IMAGE_IDENTIFIER above ties to the
      // image. Left at `false` this would run once at creation and never again, so a
      // later deploy carrying new migrations would silently skip them and leave the
      // API serving against a schema it does not match.
      executeOnHandlerChange: true,
      executeAfter: props.executeAfter,
    });
  }
}
