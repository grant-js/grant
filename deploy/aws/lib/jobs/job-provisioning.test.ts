/**
 * Slice 6 assertions: scheduled work actually runs, and only where it is reachable.
 *
 * The count is the acceptance criterion the brief names — **exactly six rules**, five
 * production plus one demo-gated — and the synthesized template is the evidence for
 * it. The rest of this file pins the two things a template review would not catch: the
 * dispatch path is a contract between the Lambda Web Adapter and `apps/api`, and the
 * function carrying that route must have no publicly reachable endpoint.
 */

import { App, Stack } from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { Certificate } from 'aws-cdk-lib/aws-certificatemanager';
import { Repository } from 'aws-cdk-lib/aws-ecr';
import { ContainerImage } from 'aws-cdk-lib/aws-ecs';
import { DockerImageCode } from 'aws-cdk-lib/aws-lambda';
import { HostedZone } from 'aws-cdk-lib/aws-route53';
import { describe, expect, it } from 'vitest';

import { EVENT_DISPATCH_PATH } from '../compute/jobs-function';
import type { GrantEnv } from '../config/props';
import { GrantPlatform } from '../grant-platform';
import { SCHEDULED_JOBS } from './scheduled-jobs';

/** Caller-supplied images throughout: building the asset dominates the run. */
function build(overrides: { env?: GrantEnv; jobs?: { enabled?: boolean } } = {}) {
  const app = new App();
  const stack = new Stack(app, 'TestStack', {
    env: { account: '123456789012', region: 'eu-central-1' },
  });
  const platform = new GrantPlatform(stack, 'Grant', {
    appUrl: 'https://grant.example.com',
    dns: {
      hostedZone: HostedZone.fromHostedZoneAttributes(stack, 'Zone', {
        hostedZoneId: 'ZTEST000000000',
        zoneName: 'example.com',
      }),
      certificate: Certificate.fromCertificateArn(
        stack,
        'Cert',
        'arn:aws:acm:us-east-1:123456789012:certificate/abc-123'
      ),
    },
    database: {},
    migration: {
      image: ContainerImage.fromRegistry('grant/api:test'),
      imageIdentifier: 'test-image',
    },
    api: {
      image: DockerImageCode.fromEcr(Repository.fromRepositoryName(stack, 'Repo', 'grant/api'), {
        tagOrDigest: 'test',
      }),
    },
    ...(overrides.jobs ? { jobs: overrides.jobs } : {}),
    ...(overrides.env ? { env: overrides.env } : {}),
  });
  return { template: Template.fromStack(stack), platform };
}

/**
 * The dispatcher: the one function with the route actually enabled.
 *
 * Matched on the *value*, not on the key being present. Since gate 4's F-A the API
 * function pins this to `'false'` so a config file cannot enable it on a function
 * that has a public URL, so both functions now set the key and only the value tells
 * them apart.
 */
function jobsEnvironment(template: Template): Record<string, unknown> {
  const functions = Object.values(template.findResources('AWS::Lambda::Function'));
  const jobs = functions.filter((fn) => {
    const props = fn.Properties as { Environment?: { Variables?: Record<string, unknown> } };
    return props.Environment?.Variables?.JOBS_EVENT_DISPATCH_ENABLED === 'true';
  });
  expect(jobs).toHaveLength(1);
  const props = jobs[0]!.Properties as { Environment: { Variables: Record<string, unknown> } };
  return props.Environment.Variables;
}

describe('EventBridge rules are generated, and the count is the evidence', () => {
  it('synthesizes exactly six rules', () => {
    // Five production plus one demo-gated. A different count is a failed slice even if
    // the deploy works — the brief says so, because generation is what is being
    // verified, not that some rules exist.
    build().template.resourceCountIs('AWS::Events::Rule', 6);
  });

  it('names every job exactly once, as the rule target input', () => {
    const { template } = build();
    const rules = Object.values(template.findResources('AWS::Events::Rule'));

    const dispatched = rules
      .flatMap((rule) => (rule.Properties as { Targets: Array<{ Input?: string }> }).Targets)
      .map((target) => JSON.parse(target.Input as string) as { jobId: string })
      .map((input) => input.jobId)
      .sort();

    expect(dispatched).toEqual([...SCHEDULED_JOBS].map((job) => job.id).sort());
  });

  it('translates each schedule into EventBridge syntax rather than passing Unix cron through', () => {
    const { template } = build();
    const expressions = Object.values(template.findResources('AWS::Events::Rule')).map(
      (rule) => (rule.Properties as { ScheduleExpression: string }).ScheduleExpression
    );

    // Six fields, and exactly one of the two day fields unspecified. A five-field
    // expression is rejected at deploy, an unshifted day-of-week is not rejected at all.
    for (const expression of expressions) {
      const fields = /^cron\((.+)\)$/.exec(expression)?.[1]?.split(' ') as string[];
      expect(fields).toHaveLength(6);
      expect([fields[2], fields[4]].filter((field) => field === '?')).toHaveLength(1);
    }
  });

  it('arms a rule from configuration, and still creates the disabled ones', () => {
    // The count must not be a function of configuration: a template with five rules
    // would need careful reading to tell a disabled job from a lost one.
    const { template } = build();
    const rules = Object.values(template.findResources('AWS::Events::Rule'));

    const states = rules.map((rule) => (rule.Properties as { State: string }).State);
    expect(states.filter((state) => state === 'ENABLED')).toHaveLength(4);
    // Signing-key rotation and the demo refresh are both off by default in @grantjs/env.
    expect(states.filter((state) => state === 'DISABLED')).toHaveLength(2);
  });

  it('moves a rule when the deployment overrides the schedule', () => {
    // The application reads the same key, so both views of the schedule move together.
    // Two sources that can disagree is exactly what this slice exists to avoid.
    const { template } = build({ env: { JOBS_WEBHOOK_DELIVERY_SCHEDULE: '*/5 * * * *' } });

    template.hasResourceProperties('AWS::Events::Rule', {
      ScheduleExpression: 'cron(*/5 * * * ? *)',
      Targets: Match.arrayWith([
        Match.objectLike({ Input: JSON.stringify({ jobId: 'webhook-delivery' }) }),
      ]),
    });
  });

  it('arms the demo refresh when demo mode is on', () => {
    const { template } = build({ env: { DEMO_MODE_ENABLED: 'true' } });

    template.hasResourceProperties('AWS::Events::Rule', {
      State: 'ENABLED',
      Targets: Match.arrayWith([
        Match.objectLike({ Input: JSON.stringify({ jobId: 'demo-db-refresh' }) }),
      ]),
    });
  });
});

describe('the dispatcher is not reachable from the internet', () => {
  it('gives the jobs function no Function URL', () => {
    // The whole security argument for a second function. The dispatch route is mounted
    // ahead of origin verification because no AWS event source can send CloudFront's
    // secret; that is safe only while `lambda:InvokeFunction` is the sole way in.
    const { template } = build();
    const [jobsLogicalId] = Object.entries(template.findResources('AWS::Lambda::Function'))
      .filter(
        ([, fn]) =>
          (fn.Properties as { Environment?: { Variables?: Record<string, unknown> } }).Environment
            ?.Variables?.JOBS_EVENT_DISPATCH_ENABLED === 'true'
      )
      .map(([logicalId]) => logicalId);

    expect(jobsLogicalId).toBeDefined();

    const urls = Object.values(template.findResources('AWS::Lambda::Url'));
    // The API has one. Nothing points at the dispatcher.
    expect(urls.length).toBeGreaterThan(0);
    for (const url of urls) {
      const target = JSON.stringify(
        (url.Properties as { TargetFunctionArn: unknown }).TargetFunctionArn
      );
      expect(target).not.toContain(jobsLogicalId as string);
    }
  });

  it('mounts the dispatch route only on the function without a URL', () => {
    const { template } = build();
    const withDispatch = Object.values(template.findResources('AWS::Lambda::Function')).filter(
      (fn) =>
        (fn.Properties as { Environment?: { Variables?: Record<string, unknown> } }).Environment
          ?.Variables?.JOBS_EVENT_DISPATCH_ENABLED === 'true'
    );

    expect(withDispatch).toHaveLength(1);
  });

  it('agrees with the Lambda Web Adapter about where events arrive', () => {
    // Two settings, one constant. A mismatch produces a 404 that the event source
    // records as a successful invocation, so nothing retries and nothing alarms.
    const env = jobsEnvironment(build().template);

    expect(env.JOBS_EVENT_DISPATCH_ENABLED).toBe('true');
    expect(env.JOBS_EVENT_DISPATCH_PATH).toBe(EVENT_DISPATCH_PATH);
    expect(env.AWS_LWA_PASS_THROUGH_PATH).toBe(EVENT_DISPATCH_PATH);
  });

  it('keeps origin verification required on the jobs function too', () => {
    // Nothing else is mounted ahead of it, so the fail-closed posture is unchanged for
    // every other path. Disabling it here would be a second control removed silently.
    expect(jobsEnvironment(build().template).SECURITY_ORIGIN_VERIFY_REQUIRED).toBe('true');
  });
});

describe('nothing runs before the schema exists', () => {
  it('creates the jobs function only after the migration has finished', () => {
    // Measured, not anticipated: the first deploy armed the rules while the migrate
    // one-shot was still running, and the every-minute sweeps spent ninety seconds
    // failing with `relation "event_log" does not exist`. Ordering the function covers
    // the queue too — the event-source mapping is created with it.
    const { template } = build();
    const [, jobsFunction] = Object.entries(template.findResources('AWS::Lambda::Function')).find(
      ([, fn]) =>
        (fn.Properties as { Environment?: { Variables?: Record<string, unknown> } }).Environment
          ?.Variables?.JOBS_EVENT_DISPATCH_ENABLED === 'true'
    ) as [string, { DependsOn?: string[] }];

    const dependsOn = jobsFunction.DependsOn ?? [];
    expect(dependsOn.some((id) => id.includes('MigrateTrigger'))).toBe(true);
  });
});

describe('one-off jobs leave the request path', () => {
  it('selects the AWS provider, which is what makes the rules load-bearing', () => {
    // Under node-cron the application schedules its own timers, which on Lambda fire
    // only while a container happens to be thawed — and would double up with the rules.
    expect(jobsEnvironment(build().template).JOBS_PROVIDER).toBe('aws');
  });

  it('gives both functions the queue, one to send and one to consume', () => {
    const { template } = build();
    const queueUrls = Object.values(template.findResources('AWS::Lambda::Function'))
      .map(
        (fn) =>
          (fn.Properties as { Environment?: { Variables?: Record<string, unknown> } }).Environment
            ?.Variables?.JOBS_AWS_QUEUE_URL
      )
      .filter((url) => url !== undefined);

    // The API and the jobs function. The web app and nothing else.
    expect(queueUrls).toHaveLength(2);
  });

  it('consumes one message at a time and reports partial batch failures', () => {
    // batchSize 1 keeps unrelated tenants' work out of one timeout; the failure report
    // is what redelivers a failed message without redelivering its neighbours.
    build().template.hasResourceProperties('AWS::Lambda::EventSourceMapping', {
      BatchSize: 1,
      FunctionResponseTypes: ['ReportBatchItemFailures'],
    });
  });

  it('parks poison messages instead of retrying them forever', () => {
    const { template } = build();

    template.resourceCountIs('AWS::SQS::Queue', 2);
    template.hasResourceProperties('AWS::SQS::Queue', {
      RedrivePolicy: Match.objectLike({ maxReceiveCount: 3 }),
    });
  });

  it('gives the queue a visibility window longer than the consumer may run', () => {
    // Shorter, and a second consumer receives a message the first is still working on.
    // Every job here mutates the database, so that is a duplicate write, not a retry.
    const { template } = build();
    const queues = Object.values(template.findResources('AWS::SQS::Queue'));
    const withRedrive = queues.find(
      (queue) => (queue.Properties as { RedrivePolicy?: unknown }).RedrivePolicy !== undefined
    );

    const visibility = (withRedrive?.Properties as { VisibilityTimeout: number }).VisibilityTimeout;
    expect(visibility).toBeGreaterThanOrEqual(15 * 60);
  });

  it('provisions nothing when jobs are turned off', () => {
    // The opt-out has to be complete: a queue with no consumer accepts work and never
    // runs it, which is worse than refusing to enqueue.
    const { template } = build({ jobs: { enabled: false } });

    template.resourceCountIs('AWS::Events::Rule', 0);
    template.resourceCountIs('AWS::SQS::Queue', 0);
    template.resourceCountIs('AWS::Lambda::EventSourceMapping', 0);
  });
});
