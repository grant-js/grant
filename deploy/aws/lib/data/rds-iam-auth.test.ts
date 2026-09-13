/**
 * RDS IAM authentication, opt-in.
 *
 * Slice 14. The option exists so an adopter can replace a stored database password with a
 * short-lived token derived from the caller's own role. What these assert is the shape of
 * the opt-in — that asking for it produces both halves the stack owes, and that *not*
 * asking for it leaves the template exactly as it was.
 *
 * The third condition — `GRANT rds_iam TO <user>` inside Postgres — is not assertable here
 * and is not CDK's to perform. That asymmetry is the reason the default is off: the flag
 * without the grant is a deployment that cannot authenticate.
 */
import { App, Stack } from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { HostedZone } from 'aws-cdk-lib/aws-route53';
import { describe, expect, it } from 'vitest';

import { GrantPlatform } from '../grant-platform';

function build(options: { iam?: boolean } = {}) {
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
    database: options.iam === undefined ? {} : { iamAuthentication: options.iam },
    migration: { enabled: false },
  });
  return { template: Template.fromStack(stack), platform };
}

/** Every `rds-db:connect` statement in the template. */
function connectStatements(template: Template) {
  return Object.values(template.findResources('AWS::IAM::Policy'))
    .flatMap(
      (policy) =>
        (policy.Properties?.PolicyDocument?.Statement ?? []) as Array<{ Action?: unknown }>
    )
    .filter((statement) => {
      const actions = Array.isArray(statement.Action) ? statement.Action : [statement.Action];
      return actions.includes('rds-db:connect');
    });
}

describe('enabled', () => {
  it('turns the feature on at the cluster', () => {
    build({ iam: true }).template.hasResourceProperties('AWS::RDS::DBCluster', {
      EnableIAMDatabaseAuthentication: true,
    });
  });

  it('grants the API `rds-db:connect`, so a token is accepted', () => {
    // The flag alone authenticates nobody: the caller's role needs this permission, scoped
    // to one database user on one cluster resource id.
    const statements = connectStatements(build({ iam: true }).template);

    expect(statements).toHaveLength(1);
    expect(JSON.stringify(statements[0])).toContain('dbuser');
  });
});

describe('the default', () => {
  it('grants nothing', () => {
    expect(connectStatements(build().template)).toEqual([]);
  });

  it('writes no cluster property at all, keeping the template byte-identical', () => {
    // Not merely "false". Writing the property emits
    // `EnableIAMDatabaseAuthentication: false` where nothing stood before — a no-op to RDS
    // and a one-line changeset diff on every existing deployment, against a slice that
    // declared none. The committed snapshots are the other half of this assertion.
    const clusters = Object.values(build().template.findResources('AWS::RDS::DBCluster'));

    expect(clusters).toHaveLength(1);
    expect('EnableIAMDatabaseAuthentication' in (clusters[0].Properties ?? {})).toBe(false);
  });

  it('is also the behaviour when explicitly disabled', () => {
    const { template } = build({ iam: false });

    expect(connectStatements(template)).toEqual([]);
    template.hasResourceProperties(
      'AWS::RDS::DBCluster',
      Match.not({
        EnableIAMDatabaseAuthentication: true,
      })
    );
  });
});
