/**
 * ADR 0002's escape hatch, as the template renders it.
 *
 * A 28,880-entity CDM import takes 62.3 minutes against Lambda's hard 15-minute ceiling
 * (`plans/2026-09-09-aws-followups-closeout-measurements.md` § ADR 0002), and the import
 * cannot be chunked without abandoning its single-transaction guarantee. So execution
 * moves to a Fargate task, and these are the properties that make the move real rather
 * than nominal: a task that runs the sync entrypoint, a dispatcher permitted to start
 * exactly that task and nothing else, and — on a topology with no VPC — no hatch at all.
 */
import { App, SecretValue, Stack } from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { HostedZone } from 'aws-cdk-lib/aws-route53';
import { describe, expect, it } from 'vitest';

import { GrantPlatform } from '../grant-platform';

function build(options: { vpc?: boolean; sync?: boolean } = {}) {
  const withVpc = options.vpc ?? true;
  const app = new App();
  const stack = new Stack(app, 'TestStack', {
    env: { account: '123456789012', region: 'us-east-1' },
  });
  const platform = new GrantPlatform(stack, 'Grant', {
    appUrl: 'https://grant.example.com',
    dns: {
      hostedZone: HostedZone.fromHostedZoneAttributes(stack, 'Zone', {
        hostedZoneId: 'ZTEST000000000',
        zoneName: 'example.com',
      }),
    },
    ...((options.sync ?? true) ? { sync: { enabled: true } } : {}),
    ...(withVpc
      ? { database: {} }
      : {
          // The bring-your-own vpcless shape: a database this stack does not create and
          // no VPC at all.
          databaseUrl: SecretValue.unsafePlainText('postgres://u:p@db.example:5432/grant'),
        }),
  });
  return { template: Template.fromStack(stack), platform };
}

interface PolicyStatementShape {
  Action?: unknown;
  Resource?: unknown;
  Condition?: Record<string, unknown>;
}

/**
 * The statement granting `action` over a resource whose logical id contains `mentions`.
 *
 * Both discriminators are necessary. The migrate trigger already grants `ecs:RunTask` and
 * `iam:PassRole` in the same shapes, so an assertion keyed on the action alone matches its
 * statement and reports nothing about the sync grant.
 */
function findStatement(
  template: Template,
  action: string,
  mentions: string
): PolicyStatementShape | undefined {
  return Object.values(template.findResources('AWS::IAM::Policy'))
    .flatMap(
      (policy) => (policy.Properties?.PolicyDocument?.Statement ?? []) as PolicyStatementShape[]
    )
    .filter((statement) => {
      const actions = Array.isArray(statement.Action) ? statement.Action : [statement.Action];
      return actions.includes(action);
    })
    .find((statement) => JSON.stringify(statement.Resource).includes(mentions));
}

describe('the sync task', () => {
  it('runs the sync entrypoint, not the server', () => {
    // The image's default command starts an HTTP server behind the Lambda Web Adapter.
    // A task running that would listen forever and never import anything.
    build().template.hasResourceProperties('AWS::ECS::TaskDefinition', {
      ContainerDefinitions: Match.arrayWith([
        Match.objectLike({
          Name: 'Sync',
          Command: ['node', 'dist/run-sync-job.js'],
        }),
      ]),
    });
  });

  it('bakes no job id into the task definition', () => {
    // The job id and scope are per-execution `RunTask` overrides. A task definition
    // carrying one would make every dispatched task apply the same row — which is a
    // cross-tenant write, not merely a bug.
    const { template } = build();
    const defs = Object.values(template.findResources('AWS::ECS::TaskDefinition'));
    const sync = defs
      .flatMap((d) => d.Properties?.ContainerDefinitions ?? [])
      .find((c: { Name?: string }) => c.Name === 'Sync') as
      { Environment?: Array<{ Name: string }> } | undefined;

    expect(sync).toBeDefined();
    const names = (sync?.Environment ?? []).map((e) => e.Name);
    expect(names).not.toContain('GRANT_SYNC_JOB_ID');
    expect(names).not.toContain('GRANT_SYNC_JOB_SCOPE');
  });

  it('never dispatches to itself', () => {
    // The entrypoint calls the job body directly so re-entry is unreachable, but a task
    // definition that said `container` would be one edit away from a task that starts a
    // task per attempt without end.
    const { template } = build();
    const defs = Object.values(template.findResources('AWS::ECS::TaskDefinition'));
    const sync = defs
      .flatMap((d) => d.Properties?.ContainerDefinitions ?? [])
      .find((c: { Name?: string }) => c.Name === 'Sync') as
      { Environment?: Array<{ Name: string; Value: string }> } | undefined;

    const runtime = (sync?.Environment ?? []).find((e) => e.Name === 'JOBS_SYNC_RUNTIME');
    expect(runtime?.Value).toBe('inprocess');
  });

  it("shares the migrate task's cluster rather than creating a second one", () => {
    // A cluster is a namespace. The two tasks share no role and no security boundary, so
    // a second cluster buys nothing and is one more thing teardown has to remove.
    build().template.resourceCountIs('AWS::ECS::Cluster', 1);
  });
});

describe("the dispatcher's permissions", () => {
  it('may start the sync task, in its own cluster, and nothing else', () => {
    // Bound to the *sync* task definition by name. The migrate trigger carries an
    // identically shaped `ecs:RunTask` statement, so an assertion that merely looks for
    // one somewhere in the template passes no matter what this grant says — which is how
    // the first version of this test survived widening the resource to `*`.
    const statement = findStatement(build().template, 'ecs:RunTask', 'SyncTaskDefinition');

    expect(statement).toBeDefined();
    expect(statement?.Resource).not.toBe('*');
    expect(JSON.stringify(statement?.Resource)).toContain('SyncTaskDefinition');
    expect(statement?.Condition).toEqual({
      ArnEquals: { 'ecs:cluster': { 'Fn::GetAtt': [expect.stringContaining('Cluster'), 'Arn'] } },
    });
  });

  it('passes only the two roles the task definition names, and only to ECS', () => {
    // An unscoped `iam:PassRole` is a privilege-escalation primitive: it would let the
    // jobs function launch a task as any role in the account. The service condition is
    // the second half — without it the grant is "pass these roles anywhere".
    // Bound to the sync task's roles for the same reason as above: the migrate trigger
    // has its own `iam:PassRole`, and matching that one instead let the first version of
    // this test survive deleting this condition entirely.
    const statement = findStatement(build().template, 'iam:PassRole', 'SyncTaskDefinitionTaskRole');

    expect(statement).toBeDefined();
    expect(statement?.Resource).toHaveLength(2);
    expect(statement?.Condition).toEqual({
      StringEquals: { 'iam:PassedToService': 'ecs-tasks.amazonaws.com' },
    });
  });

  it('is told where the runtime is, so the dispatcher has somewhere to dispatch', () => {
    const { template } = build();
    const fns = Object.values(template.findResources('AWS::Lambda::Function'));
    const withSync = fns.filter(
      (f) => f.Properties?.Environment?.Variables?.JOBS_SYNC_RUNTIME === 'container'
    );

    expect(withSync).toHaveLength(1);
    const vars = withSync[0].Properties.Environment.Variables;
    expect(vars.JOBS_SYNC_TASK_CONTAINER_NAME).toBe('Sync');
    expect(vars.JOBS_SYNC_TASK_CLUSTER_ARN).toBeDefined();
    expect(vars.JOBS_SYNC_TASK_DEFINITION_ARN).toBeDefined();
    expect(vars.JOBS_SYNC_TASK_SUBNET_IDS).toBeDefined();
  });
});

describe('the default', () => {
  it('creates no sync task unless asked, so an existing deploy gains nothing', () => {
    // ADR 0002: "existing deployments keep running the job in-process exactly as today."
    // Default-on would put a Fargate task definition into every VPC-bearing deploy,
    // including the ones whose imports finish in two seconds. The committed CDK snapshots
    // are the other half of this assertion — they are unchanged by this slice.
    const { template, platform } = build({ sync: false });

    expect(platform.syncTask).toBeUndefined();
    // One task definition remains: the migrate one-shot, which is not this feature.
    template.resourceCountIs('AWS::ECS::TaskDefinition', 1);
  });

  it('leaves the dispatcher in-process, rather than pointing it at nothing', () => {
    const { template } = build({ sync: false });
    const fns = Object.values(template.findResources('AWS::Lambda::Function'));

    for (const fn of fns) {
      expect(fn.Properties?.Environment?.Variables?.JOBS_SYNC_RUNTIME).not.toBe('container');
    }
  });
});

describe('a topology with no VPC', () => {
  it('has no sync task, and says so by having none', () => {
    // A Fargate task needs a VPC. On the vpcless bring-your-own-database shape sync stays
    // on Lambda and stays bounded by 15 minutes — a documented limit of that topology,
    // recorded in ADR 0002 rather than left for an adopter to discover at 15 minutes.
    const { template, platform } = build({ vpc: false });

    expect(platform.syncTask).toBeUndefined();
    template.resourceCountIs('AWS::ECS::TaskDefinition', 0);
  });

  it('does not tell the dispatcher to dispatch', () => {
    // The dangerous failure: `JOBS_SYNC_RUNTIME=container` with no task would make every
    // sync job fail at dispatch instead of running in-process.
    const { template } = build({ vpc: false });
    const fns = Object.values(template.findResources('AWS::Lambda::Function'));

    for (const fn of fns) {
      expect(fn.Properties?.Environment?.Variables?.JOBS_SYNC_RUNTIME).not.toBe('container');
    }
  });
});
