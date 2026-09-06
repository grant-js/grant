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
function secretStringTemplate(template: Template): unknown {
  const secrets = template.findResources('AWS::SecretsManager::Secret', {
    Properties: { Description: 'Grant platform environment — JSON of ENV_NAME: value' },
  });
  const entries = Object.values(secrets);
  expect(entries).toHaveLength(1);
  return entries[0]!.Properties.GenerateSecretString.SecretStringTemplate;
}

/** Text form, for containment assertions on the green-field `Fn::Join`. */
function secretString(template: Template): string {
  return JSON.stringify(secretStringTemplate(template));
}

/**
 * The parsed `ENV_NAME: value` object.
 *
 * Only available on the bring-your-own path, where the whole template is one literal
 * string. Composing a URL from cluster credentials interleaves two dynamic
 * references, so CDK emits an `Fn::Join` there and there is no document to parse.
 *
 * Worth the split, because containment assertions cannot catch a key renamed or an
 * extra key added. `DB_URL` is a literal contract with
 * `resolveDatabaseConnectionString` (`apps/api/src/lib/secrets/database-url.ts:41`),
 * and getting it wrong fails silently: the application falls back to composing a URL
 * from `POSTGRES_*` defaults, so the operator sees a connection error to `localhost`
 * rather than anything naming the secret.
 */
function secretKeys(template: Template): Record<string, string> {
  const rendered = secretStringTemplate(template);
  expect(typeof rendered).toBe('string');
  return JSON.parse(rendered as string) as Record<string, string>;
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
  it('renders DB_URL as exactly one dynamic reference and nothing else', () => {
    const keys = secretKeys(build(() => ({ databaseUrl: SecretValue.secretsManager(BYO_ARN) })));

    // Equality, not containment. The key name is the contract; the value being the
    // whole reference is what proves no plaintext and no rewriting can have happened.
    expect(Object.keys(keys)).toEqual(['DB_URL']);
    expect(keys.DB_URL).toBe(`{{resolve:secretsmanager:${BYO_ARN}:SecretString:::}}`);
  });

  it('leaves no connection string anywhere in the synthesized template', () => {
    // The whole-template check, not just this construct's property: a password that
    // reaches any resource reaches `cdk.out` on disk and `cloudformation:GetTemplate`.
    const template = build(() => ({ databaseUrl: SecretValue.secretsManager(BYO_ARN) }));

    expect(JSON.stringify(template.toJSON())).not.toMatch(/postgres(ql)?:\/\//);
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
    const keys = secretKeys(
      build(() => ({ databaseUrl: SecretValue.unsafePlainText('postgresql://u:p@h:5432/d') }))
    );

    expect(keys.DB_URL).toBe('postgresql://u:p@h:5432/d');
  });

  it.each([
    ['empty', ''],
    ['blank', '   '],
    ['not a URL', 'not-a-url'],
    ['the wrong scheme', 'mysql://u:p@h:3306/d'],
  ])('refuses a literal that is %s', (_name, value) => {
    // Writing one of these to the platform secret deploys cleanly and then fails as a
    // connection error to localhost, because the application composes a URL from
    // POSTGRES_* defaults when it cannot read DB_URL.
    expect(() => build(() => ({ databaseUrl: SecretValue.unsafePlainText(value) }))).toThrow(
      /must begin with postgresql:\/\/ or postgres:\/\//
    );
  });

  it.each([
    ['a quote', 'postgresql://u:p"x@h:5432/d'],
    ['a backslash', 'postgresql://u:p\\x@h:5432/d'],
    ['a newline', 'postgresql://u:p@h:5432/d\n'],
  ])('refuses a literal containing %s', (_name, value) => {
    // The value lands inside a JSON document. A quote does not merely break it — it
    // can close DB_URL and open another key, and that document is the resolver's
    // entire input.
    expect(() => build(() => ({ databaseUrl: SecretValue.unsafePlainText(value) }))).toThrow(
      /quote, backslash or newline/
    );
  });

  it('says nothing about the value it refused', () => {
    // Synth errors reach terminals and CI logs.
    expect(() =>
      build(() => ({ databaseUrl: SecretValue.unsafePlainText('mysql://u:hunter2@h/d') }))
    ).toThrow(expect.not.stringContaining('hunter2'));
  });
});

describe('a cluster this stack created', () => {
  it('composes the URL from the credentials, with sslmode=require', () => {
    const rendered = secretString(build(ownedProps));

    // The key name is the contract even where the value is a join; pinned as text
    // here for the same reason it is pinned by equality on the BYO path.
    expect(rendered).toContain('{\\"DB_URL\\":\\"postgresql://');
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
