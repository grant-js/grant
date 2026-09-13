/**
 * The compensating control, asserted where it is created.
 *
 * Phase C's slice 4 security review accepted "the Function URL is publicly reachable"
 * *because* an alert on the origin-verify refusal log would exist. It did not. These
 * cases are the ones that would let it quietly stop existing again: an alarm that is
 * created only in some topologies, an alarm with no action where one was asked for, and
 * a filter pattern coupled to the English of a log message.
 */
import { App, Stack } from 'aws-cdk-lib';
import { SecretValue } from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { Certificate } from 'aws-cdk-lib/aws-certificatemanager';
import { Vpc } from 'aws-cdk-lib/aws-ec2';
import { Repository } from 'aws-cdk-lib/aws-ecr';
import { DockerImageCode } from 'aws-cdk-lib/aws-lambda';
import { HostedZone } from 'aws-cdk-lib/aws-route53';
import { Topic } from 'aws-cdk-lib/aws-sns';
import { describe, expect, it } from 'vitest';

import { GrantPlatform } from '../grant-platform';
import { ORIGIN_VERIFY_METRIC_NAME, ORIGIN_VERIFY_METRIC_NAMESPACE } from './origin-verify-alarm';

type Topology = 'green-field' | 'byo-vpc' | 'byo-vpcless';

/**
 * The three shapes `synth:check` snapshots, built here as well because the alarm has to
 * exist on all of them. A control present only on the topology the template happens to
 * snapshot is the same paper control in a narrower place.
 */
/**
 * Synthesized templates, memoized per fixture.
 *
 * Each call synthesizes a whole platform — VPC, Aurora cluster, CloudFront distribution
 * — and the first in the process also stages the docs asset. At one synth per `it` that
 * was thirteen of them, and on the self-hosted runner, where the monorepo pipeline runs
 * concurrently, the first one alone blew the suite's 30 s timeout. `Template` is a
 * read-only assertion surface, so sharing one per fixture is safe and cuts the file to
 * four synths.
 */
const templates = new Map<string, Template>();

function build(topology: Topology, options: { withTopic?: boolean } = {}): Template {
  const key = `${topology}:${options.withTopic ? 'topic' : 'no-topic'}`;
  const cached = templates.get(key);
  if (cached) return cached;

  const template = synthesize(topology, options);
  templates.set(key, template);
  return template;
}

function synthesize(topology: Topology, options: { withTopic?: boolean } = {}) {
  const app = new App();
  const stack = new Stack(app, 'TestStack', {
    env: { account: '123456789012', region: 'eu-central-1' },
  });

  const database =
    topology === 'green-field'
      ? { database: {} }
      : {
          databaseUrl: SecretValue.secretsManager(
            'arn:aws:secretsmanager:eu-central-1:123456789012:secret:grant/db-AbCdEf'
          ),
          ...(topology === 'byo-vpc'
            ? {
                network: {
                  vpc: Vpc.fromVpcAttributes(stack, 'Vpc', {
                    vpcId: 'vpc-0123456789abcdef0',
                    availabilityZones: ['eu-central-1a', 'eu-central-1b'],
                    privateSubnetIds: ['subnet-0aaa', 'subnet-0bbb'],
                  }),
                },
              }
            : {}),
        };

  new GrantPlatform(stack, 'Grant', {
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
    ...database,
    api: {
      image: DockerImageCode.fromEcr(Repository.fromRepositoryName(stack, 'Repo', 'grant/api'), {
        tagOrDigest: 'test',
      }),
    },
    ...(options.withTopic ? { observability: { alarmTopic: new Topic(stack, 'AlarmTopic') } } : {}),
  });

  return Template.fromStack(stack);
}

const TOPOLOGIES: Topology[] = ['green-field', 'byo-vpc', 'byo-vpcless'];

describe.each(TOPOLOGIES)('on the %s topology', (topology) => {
  it('creates the metric filter and the alarm', () => {
    const template = build(topology);

    template.resourceCountIs('AWS::Logs::MetricFilter', 1);
    template.resourceCountIs('AWS::CloudWatch::Alarm', 1);
  });

  it('points the filter at the API function log group', () => {
    // Stack-owned, so a Ref rather than an imported name. A filter attached to the
    // wrong group — the jobs function's, say — would never see a refusal.
    const filters = Object.values(build(topology).findResources('AWS::Logs::MetricFilter'));
    const props = filters[0]?.Properties as { LogGroupName: { Ref?: string } };

    expect(props.LogGroupName.Ref).toMatch(/ApiLogs/);
  });
});

describe('the filter matches structure, not prose', () => {
  it('keys on the module binding and the level, and mentions no message text', () => {
    // Risk 4 on this story's plan. `createLogger('OriginVerify')` binds `module` and
    // `log.warn` sets `level`; the `msg` string is English that someone will improve.
    // A pattern that depended on it would silently stop matching, and the control
    // would keep reporting healthy — which is the failure this construct exists to
    // prevent, reproduced inside the fix.
    const filters = Object.values(build('green-field').findResources('AWS::Logs::MetricFilter'));
    const pattern = (filters[0]?.Properties as { FilterPattern: string }).FilterPattern;

    // Rendered escaped, which is CloudWatch's own syntax for a literal quote inside a
    // quoted term: `"\"module\":\"OriginVerify\"" "\"level\":\"warn\""`. Asserted
    // in that form rather than unescaped, because the escaping is what makes the two
    // terms match a JSON field rather than a bare word appearing anywhere in the line.
    expect(pattern).toBe('"\\"module\\":\\"OriginVerify\\"" "\\"level\\":\\"warn\\""');
    expect(pattern).not.toMatch(/refus/i);
    expect(pattern).not.toMatch(/CDN/);
  });

  it('publishes a zero when nothing matches, so the alarm has data', () => {
    // Without a default value the metric is sparse: the alarm sits in
    // INSUFFICIENT_DATA and is indistinguishable from a broken one.
    const filters = Object.values(build('green-field').findResources('AWS::Logs::MetricFilter'));
    const transformations = (
      filters[0]?.Properties as {
        MetricTransformations: { DefaultValue?: number; MetricValue: string }[];
      }
    ).MetricTransformations;

    expect(transformations[0]?.DefaultValue).toBe(0);
    expect(transformations[0]?.MetricValue).toBe('1');
  });

  it('names a metric outside the reserved AWS namespaces', () => {
    const filters = Object.values(build('green-field').findResources('AWS::Logs::MetricFilter'));
    const transformations = (
      filters[0]?.Properties as {
        MetricTransformations: { MetricNamespace: string; MetricName: string }[];
      }
    ).MetricTransformations;

    expect(transformations[0]?.MetricNamespace).toBe(ORIGIN_VERIFY_METRIC_NAMESPACE);
    expect(transformations[0]?.MetricNamespace).not.toMatch(/^AWS\//);
    expect(transformations[0]?.MetricName).toBe(ORIGIN_VERIFY_METRIC_NAME);
  });
});

describe('the alarm action is the only conditional part', () => {
  it('creates the alarm with no action when no topic is supplied', () => {
    // Gate 1 decision 1. The security review asked for a control, not a mailbox: an
    // alarm nobody is subscribed to still evaluates, still has a history, and is still
    // more than what phase C shipped.
    const template = build('green-field');

    template.resourceCountIs('AWS::CloudWatch::Alarm', 1);
    template.hasResourceProperties('AWS::CloudWatch::Alarm', {
      AlarmActions: Match.absent(),
    });
  });

  it('adds an SNS action when a topic is supplied', () => {
    const template = build('green-field', { withTopic: true });

    template.hasResourceProperties('AWS::CloudWatch::Alarm', {
      AlarmActions: [{ Ref: Match.stringLikeRegexp('AlarmTopic') }],
    });
  });

  it('alarms on a sustained rate rather than on a single refusal', () => {
    // A public Function URL is scanned continuously. An alarm that fired on one
    // refused probe would be muted by its own false positives within a day.
    const template = build('green-field');

    template.hasResourceProperties('AWS::CloudWatch::Alarm', {
      EvaluationPeriods: 2,
      Threshold: 20,
      Period: 300,
      Statistic: 'Sum',
      ComparisonOperator: 'GreaterThanOrEqualToThreshold',
      TreatMissingData: 'notBreaching',
    });
  });
});

describe('the docs-only deploy', () => {
  it('creates no alarm, because it has no API to reach', () => {
    const app = new App();
    const stack = new Stack(app, 'DocsOnly', {
      env: { account: '123456789012', region: 'eu-central-1' },
    });

    new GrantPlatform(stack, 'Grant', {
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
    });

    Template.fromStack(stack).resourceCountIs('AWS::CloudWatch::Alarm', 0);
  });
});
