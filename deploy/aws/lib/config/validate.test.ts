/**
 * Every case here is a first-deploy failure someone would otherwise hit against
 * live AWS, minutes into `cdk deploy`, with a CloudFormation error naming an
 * unrelated resource. Failing at synth with an actionable sentence is the whole
 * point of the configuration surface.
 */
import { App, SecretValue, Stack, Token } from 'aws-cdk-lib';
import { Vpc } from 'aws-cdk-lib/aws-ec2';
import { describe, expect, it } from 'vitest';

import { ConfigurationError } from './errors';
import {
  assertCertificateRegion,
  assertConcreteEnv,
  assertConfigurableEnv,
  assertDatabaseSelection,
  assertMigrationIsRunnable,
  validateAppUrl,
  validateCertificateArn,
  validateDatabaseName,
  validateHostnameInZone,
  validateSecretArn,
} from './validate';

describe('validateAppUrl', () => {
  it.each([
    ['https://grant.example.com', 'grant.example.com'],
    ['https://grant.example.com/', 'grant.example.com'],
    ['https://sub.domain.example.co.uk', 'sub.domain.example.co.uk'],
  ])('accepts %s', (appUrl, hostname) => {
    expect(validateAppUrl(appUrl)).toEqual({ hostname });
  });

  it.each([
    ['grant.example.com', 'absolute URL'],
    ['not a url', 'absolute URL'],
    // CloudFront terminates TLS and every cookie the platform sets is Secure.
    ['http://grant.example.com', 'https'],
    // The path space belongs to the routing table; a base path shifts every route.
    ['https://grant.example.com/app', 'no path'],
    ['https://grant.example.com/?x=1', 'no path'],
  ])('rejects %s', (appUrl, expectedMessage) => {
    expect(() => validateAppUrl(appUrl)).toThrow(ConfigurationError);
    expect(() => validateAppUrl(appUrl)).toThrow(new RegExp(expectedMessage));
  });

  it('names the offending value in the message', () => {
    // An error an adopter can act on without reading CDK source.
    expect(() => validateAppUrl('http://grant.example.com')).toThrow(
      /http:\/\/grant\.example\.com/
    );
  });
});

describe('validateCertificateArn', () => {
  const usEast1 = 'arn:aws:acm:us-east-1:123456789012:certificate/abc-123';

  it('accepts a us-east-1 certificate', () => {
    expect(() => validateCertificateArn(usEast1)).not.toThrow();
  });

  it('accepts non-aws partitions in us-east-1', () => {
    expect(() =>
      validateCertificateArn('arn:aws-us-gov:acm:us-east-1:123456789012:certificate/abc')
    ).not.toThrow();
  });

  it('rejects a certificate in any other region', () => {
    // The single most common first-deploy failure: issued in the stack's own region.
    expect(() =>
      validateCertificateArn('arn:aws:acm:eu-central-1:123456789012:certificate/abc-123')
    ).toThrow(/requires a certificate in us-east-1.*eu-central-1/s);
  });

  it('explains that the region requirement is independent of the stack region', () => {
    expect(() =>
      validateCertificateArn('arn:aws:acm:eu-west-1:123456789012:certificate/abc')
    ).toThrow(/whatever region the stack targets/);
  });

  it.each([['not-an-arn'], ['arn:aws:iam::123456789012:role/thing'], ['arn:aws:acm:us-east-1']])(
    'rejects %s as not an ACM certificate ARN',
    (arn) => {
      expect(() => validateCertificateArn(arn)).toThrow(ConfigurationError);
    }
  );
});

describe('validateSecretArn', () => {
  const env = { account: '123456789012', region: 'eu-central-1' };
  const arn = 'arn:aws:secretsmanager:eu-central-1:123456789012:secret:grant/db-url-AbCdEf';

  it('accepts a secret in the stack account and region', () => {
    expect(() => validateSecretArn(arn, env)).not.toThrow();
  });

  it('accepts non-aws partitions', () => {
    expect(() =>
      validateSecretArn(
        'arn:aws-us-gov:secretsmanager:eu-central-1:123456789012:secret:grant/db-AbCdEf',
        env
      )
    ).not.toThrow();
  });

  it('rejects a secret in another region', () => {
    // CloudFormation resolves the dynamic reference itself, in the stack's region, so
    // this one fails while creating the platform secret rather than here.
    expect(() =>
      validateSecretArn(
        'arn:aws:secretsmanager:us-east-1:123456789012:secret:grant/db-url-AbCdEf',
        env
      )
    ).toThrow(/in us-east-1, but this stack deploys to eu-central-1/);
  });

  it('rejects a secret in another account, and says what that would take', () => {
    expect(() =>
      validateSecretArn(
        'arn:aws:secretsmanager:eu-central-1:210987654321:secret:grant/db-url-AbCdEf',
        env
      )
    ).toThrow(/resource policy on the secret and a grant on its KMS/);
  });

  it.each([
    ['grant/db-url'],
    ['not-an-arn'],
    ['arn:aws:acm:eu-central-1:123456789012:certificate/abc-123'],
    ['arn:aws:secretsmanager:eu-central-1:123456789012'],
  ])('rejects %s as not a Secrets Manager secret ARN', (candidate) => {
    // A secret *name* is the likely paste, and it carries neither of the two things
    // worth checking — which is what the message says.
    expect(() => validateSecretArn(candidate, env)).toThrow(ConfigurationError);
    expect(() => validateSecretArn(candidate, env)).toThrow(/Not a Secrets Manager secret ARN/);
  });
});

describe('validateHostnameInZone', () => {
  it.each([
    ['grant.example.com', 'example.com'],
    ['grant.example.com', 'example.com.'],
    ['example.com', 'example.com'],
    ['a.b.example.com', 'example.com'],
  ])('accepts %s in %s', (hostname, zone) => {
    expect(() => validateHostnameInZone(hostname, zone)).not.toThrow();
  });

  it.each([
    ['grant.other.com', 'example.com'],
    // Suffix match must respect the label boundary, or notexample.com passes.
    ['grant.notexample.com', 'example.com'],
    ['example.com.evil.com', 'example.com'],
  ])('rejects %s in %s', (hostname, zone) => {
    expect(() => validateHostnameInZone(hostname, zone)).toThrow(ConfigurationError);
  });
});

describe('assertConcreteEnv', () => {
  it('accepts a concrete account and region', () => {
    expect(assertConcreteEnv('S', { account: '123456789012', region: 'eu-central-1' })).toEqual({
      account: '123456789012',
      region: 'eu-central-1',
    });
  });

  it.each([
    ['no account', { region: 'eu-central-1' }],
    ['no region', { account: '123456789012' }],
    ['neither', {}],
  ])('rejects %s', (_label, env) => {
    expect(() => assertConcreteEnv('S', env)).toThrow(ConfigurationError);
  });

  it('rejects unresolved tokens', () => {
    // The failure this guards synthesizes cleanly and fails at deploy: with both
    // regions as tokens CDK cannot see the reference crosses a region, so it emits an
    // ordinary Fn::ImportValue, and CloudFormation exports do not cross regions.
    const stack = new Stack(new App(), 'S');
    expect(() => assertConcreteEnv('S', { account: stack.account, region: stack.region })).toThrow(
      /needs a concrete account and region/
    );
  });

  it('explains the silent-synth failure mode', () => {
    expect(() => assertConcreteEnv('S', {})).toThrow(
      /synthesizes cleanly and then fails at deploy/
    );
  });
});

describe('assertCertificateRegion', () => {
  it('accepts us-east-1', () => {
    expect(() => assertCertificateRegion('us-east-1')).not.toThrow();
  });

  it('rejects any other region', () => {
    expect(() => assertCertificateRegion('eu-central-1')).toThrow(
      /only serves certificates from us-east-1/
    );
  });

  it('says how to fix it', () => {
    expect(() => assertCertificateRegion('eu-west-1')).toThrow(/separate us-east-1 stack/);
  });

  it('passes through an unresolved region', () => {
    // A region-agnostic stack cannot be checked here; the reference app's
    // assertConcreteEnv is what refuses that shape.
    const stack = new Stack(new App(), 'S');
    expect(() => assertCertificateRegion(stack.region)).not.toThrow();
  });
});

describe('validateDatabaseName', () => {
  it('accepts the default and ordinary names', () => {
    for (const name of ['grant_db', 'g', 'a1_b2', 'A'.repeat(63)]) {
      expect(validateDatabaseName(name)).toBe(name);
    }
  });

  it('rejects the reserved word a real deploy failed on', () => {
    // RDS returned "DatabaseName grant cannot be used. It is a reserved word for this
    // engine" four minutes into a deploy, after the VPC and NAT already existed.
    expect(() => validateDatabaseName('grant')).toThrow(/reserved word/);
  });

  it('is case-insensitive about reserved words', () => {
    expect(() => validateDatabaseName('GRANT')).toThrow(/reserved word/);
    expect(() => validateDatabaseName('User')).toThrow(/reserved word/);
  });

  it('rejects a hyphen, which is the likelier mistake than a reserved word', () => {
    expect(() => validateDatabaseName('grant-db')).toThrow(/letters, digits or underscores/);
  });

  it.each([['1grant'], ['_grant'], [''], ['grant db'], ['grant;drop'], ['A'.repeat(64)]])(
    'rejects %j on shape',
    (name) => {
      expect(() => validateDatabaseName(name)).toThrow(/must start with a letter/);
    }
  );

  it('passes through an unresolved token rather than guessing', () => {
    // A name resolved at deploy time has nothing to inspect; rejecting it would block
    // a legitimate configuration.
    const token = Token.asString({ Ref: 'SomeParameter' });
    expect(validateDatabaseName(token)).toBe(token);
  });
});

describe('assertDatabaseSelection', () => {
  const url = SecretValue.secretsManager(
    'arn:aws:secretsmanager:eu-central-1:123456789012:secret:grant/db-AbCdEf'
  );

  it('accepts each database prop on its own, and neither', () => {
    // Green-field, bring-your-own, and the docs-only deploy.
    expect(() => assertDatabaseSelection({ database: {} })).not.toThrow();
    expect(() => assertDatabaseSelection({ databaseUrl: url })).not.toThrow();
    expect(() => assertDatabaseSelection({})).not.toThrow();
  });

  it('refuses both, because no default resolves the ambiguity', () => {
    expect(() => assertDatabaseSelection({ database: {}, databaseUrl: url })).toThrow(
      ConfigurationError
    );
    expect(() => assertDatabaseSelection({ database: {}, databaseUrl: url })).toThrow(
      /Pick one database/
    );
  });
});

describe('assertConfigurableEnv', () => {
  it('accepts ordinary configuration', () => {
    expect(() =>
      assertConfigurableEnv({ EMAIL_PROVIDER: 'ses', GITHUB_CLIENT_ID: 'public' }, 'env')
    ).not.toThrow();
    expect(() => assertConfigurableEnv(undefined, 'env')).not.toThrow();
  });

  it.each([
    ['DB_URL', 'a database URL, which has a prop'],
    ['DB_GRANT_ROLE_URL', 'a superuser URL'],
    ['E2E_DB_URL', 'another URL with a password in it'],
    ['POSTGRES_PASSWORD', 'a password'],
    ['SMTP_PASSWORD', 'a password'],
    ['SECURITY_API_KEY', 'an API key'],
    ['ORIGIN_VERIFY_SECRET', 'generated by the stack'],
  ])('refuses %s (%s)', (key) => {
    // Slice 2 refused exactly one of these and claimed parity with the env file. A
    // security review synthesized each of the others straight into a Lambda
    // environment variable, in plaintext, in the template.
    expect(() => assertConfigurableEnv({ [key]: 'sentinel' }, 'env')).toThrow(ConfigurationError);
  });

  it('refuses a refused key even when its value is blank', () => {
    // No blank carve-out here, unlike the file. `.env.example` ships every key blank
    // and copying it must change nothing; props have no such template, so a blank
    // DB_URL is a mistake rather than a placeholder — and it was reaching the
    // functions as `DB_URL: ""`.
    expect(() => assertConfigurableEnv({ DB_URL: '' }, 'env')).toThrow(/cannot be passed/);
  });

  it.each(['db_url', 'Db_Url', ' DB_URL', 'smtp_password'])(
    'refuses %j, which nothing would ever read',
    (key) => {
      // `process.env` is case-sensitive and @grantjs/env declares only upper-case
      // keys, so these are pure leak: no effect but a credential in the template.
      expect(() => assertConfigurableEnv({ [key]: 'sentinel' }, 'env')).toThrow(
        /not a usable environment key/
      );
    }
  );

  it('names which surface was wrong', () => {
    // `env` and `web.env` are different props reaching different functions.
    expect(() => assertConfigurableEnv({ DB_URL: 'x' }, 'web.env')).toThrow(/^web\.env:/);
  });

  it('never echoes the value it refused', () => {
    expect(() => assertConfigurableEnv({ DB_URL: 'postgresql://u:hunter2@h/d' }, 'env')).toThrow(
      expect.not.stringContaining('hunter2')
    );
  });
});

describe('assertMigrationIsRunnable', () => {
  const url = SecretValue.secretsManager(
    'arn:aws:secretsmanager:eu-central-1:123456789012:secret:grant/db-AbCdEf'
  );
  const vpc = Vpc.fromVpcAttributes(new Stack(new App(), 'S'), 'Vpc', {
    vpcId: 'vpc-0123456789abcdef0',
    availabilityZones: ['eu-central-1a', 'eu-central-1b'],
    privateSubnetIds: ['subnet-aaa', 'subnet-bbb'],
  });

  it.each([
    ['green-field, which always has a VPC', { database: {} }],
    ['green-field, network omitted', { database: {}, network: undefined }],
    ["bring-your-own in the adopter's VPC", { databaseUrl: url, network: { vpc } }],
    ['bring-your-own with a VPC the stack builds', { databaseUrl: url, network: {} }],
  ])('accepts an explicit migration %s', (_label, props) => {
    expect(() =>
      assertMigrationIsRunnable({ ...props, migration: { enabled: true } })
    ).not.toThrow();
  });

  it('refuses an explicit migration where the stack builds no VPC', () => {
    // Topology C. A Fargate task needs subnets, and there are none — so this asks for
    // something that cannot be placed, and a deploy would fail with a CloudFormation
    // error naming an ECS resource rather than the configuration that caused it.
    expect(() =>
      assertMigrationIsRunnable({ databaseUrl: url, migration: { enabled: true } })
    ).toThrow(ConfigurationError);
    expect(() =>
      assertMigrationIsRunnable({ databaseUrl: url, migration: { enabled: true } })
    ).toThrow(/creates no VPC/);
  });

  it('names the command that does work rather than only refusing', () => {
    // Gate 1 was explicit that a guide telling an operator to run it themselves is not
    // a migration path. The refusal names the built one.
    expect(() =>
      assertMigrationIsRunnable({ databaseUrl: url, migration: { enabled: true } })
    ).toThrow(/pnpm --filter grant-aws-deploy migrate -c dbUrlSecretArn=<arn>/);
  });

  it('leaves the migration unset alone, because that topology simply has none', () => {
    // Left unset the stack creates no task and the operator command is the path;
    // refusing here would make topology C unconfigurable rather than explicit.
    expect(() => assertMigrationIsRunnable({ databaseUrl: url })).not.toThrow();
    expect(() =>
      assertMigrationIsRunnable({ databaseUrl: url, migration: { enabled: false } })
    ).not.toThrow();
  });

  it('says nothing about the docs-only deploy, which has no database to migrate', () => {
    // Naming a database in the message would name something absent from the
    // configuration entirely.
    expect(() => assertMigrationIsRunnable({ migration: { enabled: true } })).not.toThrow();
  });
});
