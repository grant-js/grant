/**
 * What the platform secret puts in the template, on both database topologies.
 *
 * The assertions are all of the same shape — read the rendered `SecretString` and
 * check what is and is not in it — because that string is the exact artifact a
 * password would leak through. `cdk.out` is written to disk, and anyone with
 * `cloudformation:GetTemplate` can read the deployed copy.
 */
import { App, SecretValue, Stack } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { DatabaseSecret } from 'aws-cdk-lib/aws-rds';
import { describe, expect, it } from 'vitest';

import { PlatformSecret, type PlatformSecretProps } from './platform-secret';

const BYO_ARN = 'arn:aws:secretsmanager:eu-central-1:123456789012:secret:grant/db-url-AbCdEf';

function build(props: (stack: Stack) => PlatformSecretProps) {
  const stack = new Stack(new App(), 'TestStack', {
    env: { account: '123456789012', region: 'eu-central-1' },
  });
  new PlatformSecret(stack, 'PlatformSecret', props(stack));
  return Template.fromStack(stack);
}

/**
 * The rendered `SecretString` template, as the string CloudFormation will hold.
 *
 * Selected by description rather than by position: the green-field cases also
 * synthesize the cluster's RDS-shaped secret, which has a `SecretStringTemplate` of
 * its own and would otherwise be read here instead.
 */
function secretString(template: Template): string {
  const secrets = template.findResources('AWS::SecretsManager::Secret', {
    Properties: { Description: 'Grant platform environment — JSON of ENV_NAME: value' },
  });
  const entries = Object.values(secrets);
  expect(entries).toHaveLength(1);
  return JSON.stringify(entries[0]!.Properties.GenerateSecretString.SecretStringTemplate);
}

function ownedProps(stack: Stack): PlatformSecretProps {
  return {
    databaseCredentials: new DatabaseSecret(stack, 'DbSecret', { username: 'grant' }),
    host: 'db.cluster-abc.eu-central-1.rds.amazonaws.com',
    port: 5432,
    databaseName: 'grant',
  };
}

describe('a database this stack does not own', () => {
  it('renders the URL as a dynamic reference and no plaintext', () => {
    const rendered = secretString(
      build(() => ({ databaseUrl: SecretValue.secretsManager(BYO_ARN) }))
    );

    expect(rendered).toContain('{{resolve:secretsmanager:');
    expect(rendered).toContain(BYO_ARN);
    // The reference is the whole value: nothing that looks like a connection string
    // survives into the template.
    expect(rendered).not.toContain('postgresql://');
  });

  it('still generates ORIGIN_VERIFY_SECRET', () => {
    // The reason every serving topology needs this construct, not just the
    // green-field one: CloudFront and the API agree on a value neither is configured
    // with, and it is generated here.
    const template = build(() => ({ databaseUrl: SecretValue.secretsManager(BYO_ARN) }));

    template.hasResourceProperties('AWS::SecretsManager::Secret', {
      GenerateSecretString: { GenerateStringKey: 'ORIGIN_VERIFY_SECRET' },
    });
  });

  it('uses the supplied URL as written rather than rewriting its sslmode', () => {
    // The adopter owns their connection string. A stack that appends or replaces
    // `sslmode` decides the transport security of a database it does not run.
    const rendered = secretString(
      build(() => ({ databaseUrl: SecretValue.unsafePlainText('postgresql://u:p@h:5432/d') }))
    );

    expect(rendered).toContain('postgresql://u:p@h:5432/d');
    expect(rendered).not.toContain('sslmode');
  });
});

describe('a cluster this stack created', () => {
  it('composes the URL from the credentials, with sslmode=require', () => {
    const rendered = secretString(build(ownedProps));

    expect(rendered).toContain('{{resolve:secretsmanager:');
    expect(rendered).toContain(':SecretString:username::}}');
    expect(rendered).toContain(':SecretString:password::}}');
    expect(rendered).toContain('db.cluster-abc.eu-central-1.rds.amazonaws.com:5432/grant');
    // The proxy requires TLS and `resolveDatabaseUrl` in @grantjs/env emits no SSL
    // parameter, so this is the only place it can be attached.
    expect(rendered).toContain('sslmode=require');
  });
});

describe('exactly one database', () => {
  it('refuses both forms at once', () => {
    expect(() =>
      build((stack) => ({ ...ownedProps(stack), databaseUrl: SecretValue.secretsManager(BYO_ARN) }))
    ).toThrow(/either databaseUrl or the credentials/);
  });

  it('refuses neither', () => {
    expect(() => build(() => ({}))).toThrow(/needs a database/);
  });

  it('refuses credentials with no endpoint to point them at', () => {
    // Failing here beats composing `postgresql://u:p@undefined:undefined/undefined`,
    // which deploys and fails at the first connection.
    expect(() =>
      build((stack) => ({
        databaseCredentials: new DatabaseSecret(stack, 'DbSecret', { username: 'grant' }),
      }))
    ).toThrow(/host, port and databaseName/);
  });
});
