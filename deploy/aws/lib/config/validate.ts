/**
 * Synth-time validation of the configuration surface.
 *
 * These run before any resource is created, so a misconfiguration fails during
 * `cdk synth` with a sentence an adopter can act on — rather than fifteen minutes
 * into `cdk deploy` with a CloudFormation error that names an unrelated resource.
 *
 * The Helm chart's equivalent is `values.schema.json` plus the two `fail` calls in
 * its templates. Parity with that is an acceptance criterion, not polish.
 */

import { Token } from 'aws-cdk-lib';

import {
  CREDENTIAL_KEYS,
  ENV_KEY_SHAPE,
  RESOLVER_SECRET_KEYS,
  STACK_COMPOSED_KEYS,
  STACK_GENERATED_KEYS,
} from './env-file';
import { ConfigurationError } from './errors';
import type { EmailProps, GrantEnv, GrantPlatformProps } from './props';

/** CloudFront serves certificates only from us-east-1, whatever region the stack targets. */
const CLOUDFRONT_CERTIFICATE_REGION = 'us-east-1';

/**
 * The canonical URL, normalized.
 *
 * Returns the hostname because almost every consumer wants that rather than the
 * URL — the certificate subject, the Route 53 record, the CloudFront alias.
 */
export function validateAppUrl(appUrl: string): { hostname: string } {
  let parsed: URL;
  try {
    parsed = new URL(appUrl);
  } catch {
    throw new ConfigurationError(
      `appUrl must be an absolute URL, e.g. https://grant.example.com (received: ${appUrl})`
    );
  }

  if (parsed.protocol !== 'https:') {
    throw new ConfigurationError(
      `appUrl must use https — CloudFront terminates TLS and every cookie the platform sets is Secure (received: ${appUrl})`
    );
  }

  // The Helm chart says "no trailing path" for the same reason: the path space
  // belongs to the routing table, so a base path would silently shift every route.
  if (parsed.pathname !== '/' || parsed.search !== '' || parsed.hash !== '') {
    throw new ConfigurationError(
      `appUrl must have no path, query or fragment — the path space is the routing table (received: ${appUrl})`
    );
  }

  return { hostname: parsed.hostname };
}

/**
 * Asserts a certificate ARN is one CloudFront can actually use.
 *
 * `Certificate.fromCertificateArn()` returns a token: CDK cannot check the region,
 * the domain, or that the certificate exists. The region is lexically present in the
 * ARN, so checking it costs nothing and catches the single most common first-deploy
 * failure — a certificate issued in the stack's own region.
 */
export function validateCertificateArn(arn: string): void {
  // arn:<partition>:acm:<region>:<account>:certificate/<id>
  const segments = arn.split(':');
  const [prefix, , service, region] = segments;

  if (prefix !== 'arn' || service !== 'acm' || segments.length < 6) {
    throw new ConfigurationError(
      `Not an ACM certificate ARN: ${arn}\n` +
        'Expected arn:<partition>:acm:<region>:<account>:certificate/<id>'
    );
  }

  if (region !== CLOUDFRONT_CERTIFICATE_REGION) {
    throw new ConfigurationError(
      `CloudFront requires a certificate in ${CLOUDFRONT_CERTIFICATE_REGION}, but this one is in ${region}.\n` +
        `  ${arn}\n` +
        `This is true whatever region the stack targets. Re-issue the certificate in ${CLOUDFRONT_CERTIFICATE_REGION}, ` +
        'or omit it and let the stack create and validate one against the hosted zone.'
    );
  }
}

/**
 * Asserts a Secrets Manager ARN the platform secret can actually dereference.
 *
 * `SecretValue.secretsManager()` renders `{{resolve:secretsmanager:<arn>:...}}`, which
 * CloudFormation resolves while it creates or updates the resource holding it — so a
 * secret it cannot read fails minutes into the deploy, naming the *platform secret*
 * rather than the ARN that was wrong. Everything checkable is lexically present in the
 * ARN, so it is checked here for the same reason `validateCertificateArn` is.
 *
 * Region and account are compared against the stack's own because a dynamic reference
 * is resolved by CloudFormation itself, in the stack's region and under the deploying
 * principal: a secret elsewhere needs a resource policy and a KMS grant this reference
 * app does not compose. That is a `bin/` an adopter writes (ADR 0005), where
 * `databaseUrl` takes any `SecretValue`.
 */
export function validateSecretArn(arn: string, env: { account: string; region: string }): void {
  // arn:<partition>:secretsmanager:<region>:<account>:secret:<name>-<suffix>
  const segments = arn.split(':');
  const [prefix, , service, region, account, resource] = segments;

  if (
    prefix !== 'arn' ||
    service !== 'secretsmanager' ||
    resource !== 'secret' ||
    segments.length < 7
  ) {
    throw new ConfigurationError(
      `Not a Secrets Manager secret ARN: ${arn}\n` +
        'Expected arn:<partition>:secretsmanager:<region>:<account>:secret:<name>-<suffix>.\n' +
        'Pass the full ARN rather than the secret name: the name carries neither the ' +
        'account nor the region, which are the two things worth checking before a deploy.'
    );
  }

  if (region !== env.region) {
    throw new ConfigurationError(
      `The database secret is in ${region}, but this stack deploys to ${env.region}.\n` +
        `  ${arn}\n` +
        'CloudFormation resolves a secretsmanager dynamic reference in the region of the stack ' +
        'that holds it, so this one would fail while creating the platform secret. Replicate ' +
        `the secret into ${env.region} and pass that ARN.`
    );
  }

  if (account !== env.account) {
    throw new ConfigurationError(
      `The database secret is in account ${account}, but this stack deploys to ${env.account}.\n` +
        `  ${arn}\n` +
        'A cross-account secret needs a resource policy on the secret and a grant on its KMS ' +
        'key, which this reference app does not create. Copy the connection string into a ' +
        'secret in this account, or compose `databaseUrl` yourself from your own bin/.'
    );
  }
}

/**
 * Asserts the canonical hostname sits inside the hosted zone that will hold its
 * record. A mismatch synthesizes fine and then deploys a record nothing resolves.
 */
export function validateHostnameInZone(hostname: string, zoneName: string): void {
  const zone = zoneName.replace(/\.$/, '');
  if (hostname !== zone && !hostname.endsWith(`.${zone}`)) {
    throw new ConfigurationError(
      `appUrl hostname "${hostname}" is not inside hosted zone "${zone}".\n` +
        'The stack would create a record the zone does not serve.'
    );
  }
}

/**
 * Asserts a stack's environment is concrete rather than region-agnostic.
 *
 * This exists because of a failure that **synthesizes cleanly and fails at deploy**.
 * CDK wires a cross-region reference only when it can see that the two stacks differ —
 * with both regions left as tokens it cannot, so it silently emits an ordinary
 * `Fn::ImportValue`. CloudFormation exports do not cross regions, so the deploy
 * fails with an unresolved-export error naming neither region.
 *
 * Verified by synthesizing both shapes: the agnostic pair produced no
 * `Custom::CrossRegionExportReader` at all, while the concrete pair produced the
 * reader, its Lambda and its role.
 */
export function assertConcreteEnv(
  stackName: string,
  env: { account?: string; region?: string }
): { account: string; region: string } {
  const { account, region } = env;

  if (!account || !region || Token.isUnresolved(account) || Token.isUnresolved(region)) {
    throw new ConfigurationError(
      `Stack "${stackName}" needs a concrete account and region.\n` +
        'The certificate lives in us-east-1 and the platform elsewhere, and CDK only\n' +
        'generates cross-region plumbing when both environments are known at synth time.\n' +
        'Left agnostic this synthesizes cleanly and then fails at deploy.\n' +
        '  cdk deploy -c account=123456789012 -c region=eu-central-1'
    );
  }

  return { account, region };
}

/**
 * Guards the one case where creating a certificate in the platform stack is wrong.
 *
 * CloudFront serves certificates only from us-east-1. A supplied ARN is checked
 * lexically; one created in-stack inherits the stack's region, so composing the
 * construct into a stack elsewhere would produce a distribution CloudFront rejects.
 */
export function assertCertificateRegion(region: string): void {
  if (Token.isUnresolved(region)) return;

  if (region !== CLOUDFRONT_CERTIFICATE_REGION) {
    throw new ConfigurationError(
      `A certificate created in this stack would be in ${region}, but CloudFront only ` +
        `serves certificates from ${CLOUDFRONT_CERTIFICATE_REGION}.\n` +
        'Pass an existing us-east-1 certificate via dns.certificate, or use the reference ' +
        'app in bin/, which creates it in a separate us-east-1 stack.'
    );
  }
}

/**
 * Exactly one way of naming the database.
 *
 * Supplying `database` **and** `databaseUrl` is ambiguous in a way no default
 * resolves. Picking one silently would mean the API and the migration might reach a
 * cluster the adopter is paying for while their real data sits elsewhere, or the
 * reverse — and the wrong guess is discovered by writing to the wrong database.
 */
export function assertDatabaseSelection(
  props: Pick<GrantPlatformProps, 'database' | 'databaseUrl'>
): void {
  if (props.database && props.databaseUrl) {
    throw new ConfigurationError(
      'Pick one database: `database` creates an Aurora cluster this stack owns, and ' +
        '`databaseUrl` serves against one it does not. Supplying both leaves it ' +
        'ambiguous which one the API and the migration would reach, and the answer ' +
        'would be discovered by writing to the wrong database.'
    );
  }
}

/**
 * Every key that may never become a container environment variable, built from the
 * four lists that already say so — so the two boundaries cannot refuse different
 * things.
 *
 * `RESOLVER_SECRET_KEYS` was excluded here on the reasoning that those keys have a
 * safe path and refusing them "would remove the only way to supply them". That was
 * wrong in a way worth recording: `secrets` **is** the way, so refusing them on `env`
 * removes nothing. The exclusion meant `AUTH_MFA_SECRET_ENCRYPTION_KEY`,
 * `GITHUB_CLIENT_SECRET`, and `GOOGLE_CLIENT_SECRET` — routed to the platform secret
 * by the env file — synthesized as plaintext Lambda environment variables when passed
 * through props. They were not
 * inert there either: the AWS resolver reads `payload[name] ?? process.env[name]`
 * (`@grantjs/secrets/src/aws-secrets-manager.ts:53`), so the plaintext works, which is
 * why an adopter would reach for it. The MFA key derives the AES-256 key over every
 * stored TOTP seed.
 *
 * The lesson generalizes past this list: a key belongs here if it may never be an
 * environment variable, which is not the same question as whether some other path
 * accepts it.
 */
const REFUSED_AS_ENV: readonly string[] = [
  ...STACK_GENERATED_KEYS,
  ...STACK_COMPOSED_KEYS,
  ...CREDENTIAL_KEYS,
  ...RESOLVER_SECRET_KEYS,
];

/**
 * The second configuration boundary, and the one with no parser in front of it.
 *
 * `classifyConfig` guards the env *file*: it refuses twenty keys outright, and
 * `parseEnvFile` rejects any key that is not upper-case — because a lower-case one is
 * read by nothing (`@grantjs/env` declares none and `process.env` is case-sensitive)
 * while its value is still synthesized into the template in plaintext.
 *
 * ADR 0005 explicitly invites an adopter to replace `bin/` and construct these props
 * directly, which reaches the identical Lambda environment variable with no file
 * involved. A security review of slice 2 found this boundary refusing exactly one key
 * where the file refused twenty: `db_url`, `DB_GRANT_ROLE_URL` (a **superuser** URL),
 * `POSTGRES_PASSWORD` and the rest all synthesized into the template. Both boundaries
 * now read the same lists and apply the same shape rule, and
 * `env-boundary-parity.test.ts` fails if they diverge again.
 *
 * Unlike the file path there is no blank-value carve-out. That exists in the file
 * because `.env.example` ships every key blank and copying it must change nothing;
 * props have no such template, so a refused key written blank is a mistake worth
 * naming rather than a placeholder — and it was reaching the functions as `DB_URL: ""`.
 */
export function assertConfigurableEnv(
  env: Readonly<Record<string, string>> | undefined,
  source: string
): void {
  if (!env) return;

  for (const key of Object.keys(env)) {
    if (!ENV_KEY_SHAPE.test(key)) {
      throw new ConfigurationError(
        `${source}: "${key}" is not a usable environment key — they are upper-case, ` +
          'and @grantjs/env declares none in this form, so nothing would read it. Its ' +
          'value would still be synthesized into the CloudFormation template as a ' +
          'Lambda environment variable. Rename it or remove it.'
      );
    }

    if (REFUSED_AS_ENV.includes(key)) {
      throw new ConfigurationError(
        `${source}: ${key} cannot be passed as configuration. Every key here becomes a ` +
          'Lambda environment variable, which is plaintext in the CloudFormation ' +
          'template, in the function configuration and in cdk.out on disk. For a ' +
          'database URL pass `databaseUrl: SecretValue.secretsManager(arn)`, which ' +
          'renders a dynamic reference the platform secret resolves at deploy time; ' +
          'for an application secret pass it in `secrets` as a `SecretValue`, which ' +
          'lands in the platform secret rather than on the function; for the rest, ' +
          'see docs/deployment/aws-serverless.md § Configure.'
      );
    }
  }
}

/**
 * The fourth configuration boundary, and the one the first three reviews did not count.
 *
 * `secrets` is the safe path — the values land in the platform secret rather than on
 * the function — but "safe path" is about where a value goes, not about which keys may
 * go there, and nothing checked the keys at all. Gate 4 found `ORIGIN_VERIFY_SECRET`
 * accepted here while both other boundaries refuse it by name, and a `DB_URL` that
 * silently overrode the validated `databaseUrl`: `PlatformSecret` spreads `extraEnv`
 * *after* the composed `DB_URL`, so the last writer won and it was the unchecked one.
 *
 * Three classes are refused, for two different reasons:
 *
 *   - **Generated by the stack** (`ORIGIN_VERIFY_SECRET`). It is the `generateStringKey`
 *     of the same secret, so supplying it collides with the value Secrets Manager
 *     generates. It is also the only control in front of an `AuthType: NONE` function
 *     URL, and `platform-secret.ts` states it must never pass through the template.
 *   - **Composed by the stack** (`DB_URL`). `resolveDatabaseUrl` validates the URL —
 *     scheme, and no quote, backslash or newline that could break out of the JSON
 *     document — and an override here reaches the same field having passed none of it.
 *   - **Read from `process.env` by their adapters** (`CREDENTIAL_KEYS`). These are
 *     refused for the opposite reason to the others: not because the value is unsafe
 *     here, but because it would do nothing. `CREDENTIAL_KEYS`' own comment says a
 *     value placed in the platform secret "is a value the application never sees" —
 *     the adapters read `process.env` directly. Accepting one silently is a deploy that
 *     succeeds while the credential never arrives, and with `unsafePlainText` it is a
 *     literal in the template that buys nothing.
 *
 * `RESOLVER_SECRET_KEYS` are exactly what this prop is for, and are allowed.
 */
export function assertConfigurableSecrets(
  secrets: Readonly<Record<string, unknown>> | undefined,
  source: string
): void {
  if (!secrets) return;

  for (const key of Object.keys(secrets)) {
    if (!ENV_KEY_SHAPE.test(key)) {
      throw new ConfigurationError(
        `${source}: "${key}" is not a usable environment key — they are upper-case, ` +
          'and @grantjs/env declares none in this form, so nothing would resolve it. ' +
          'Its value would still be written into the platform secret. Rename it or ' +
          'remove it.'
      );
    }

    if ((STACK_GENERATED_KEYS as readonly string[]).includes(key)) {
      throw new ConfigurationError(
        `${source}: ${key} is generated by the stack and cannot be supplied. It is ` +
          'the generated key of this very secret, so a supplied value collides with ' +
          'the one Secrets Manager creates, and CloudFront and the API agree on it ' +
          'without configuration. Remove it.'
      );
    }

    if ((STACK_COMPOSED_KEYS as readonly string[]).includes(key)) {
      throw new ConfigurationError(
        `${source}: ${key} is composed by the stack and cannot be supplied here. It ` +
          'would silently override the connection string the stack validated and ' +
          'built, without passing any of the same checks. To serve against a database ' +
          'this stack did not create, pass `databaseUrl: SecretValue.secretsManager(arn)`.'
      );
    }

    if ((CREDENTIAL_KEYS as readonly string[]).includes(key)) {
      throw new ConfigurationError(
        `${source}: ${key} cannot be supplied through the platform secret. Its adapter ` +
          'reads it from the process environment rather than through ISecretResolver, ' +
          'so a value placed here is one the application never reads — the deploy ' +
          'would succeed and the credential would never arrive. See ' +
          'docs/deployment/aws-serverless.md § Configure.'
      );
    }
  }
}

/**
 * Refuses a deploy-time migration with nowhere to run.
 *
 * The migration is a Fargate one-shot, and a Fargate task needs subnets. With
 * `database` omitted **and** `network` omitted the stack builds no VPC at all — the
 * functions run outside one and reach a routable database directly — so there is
 * nothing to place the task in.
 *
 * Left unset, the migration is simply absent there and the operator command is the
 * path. Asked for explicitly, it is refused rather than dropped: silently skipping it
 * would leave an adopter believing their schema had been applied, and the failure
 * would surface as `relation "..." does not exist` from the API on its first request.
 */
export function assertMigrationIsRunnable(
  props: Pick<GrantPlatformProps, 'database' | 'databaseUrl' | 'network' | 'migration'>
): void {
  if (props.migration?.enabled !== true) return;

  // The docs-only deploy has no migration to run either way, and refusing it there
  // would name a database that is not part of the configuration at all.
  const servesApi = props.database !== undefined || props.databaseUrl !== undefined;
  const hasVpc = props.database !== undefined || props.network !== undefined;
  if (!servesApi || hasVpc) return;

  throw new ConfigurationError(
    'migration.enabled is true, but this configuration creates no VPC: with `database` ' +
      'omitted and `network` omitted the functions run outside one, and a Fargate task ' +
      'has no subnets to be placed in.\n' +
      'Either pass `network` — an existing `vpc`, or `{}` to have the stack build one — ' +
      'or leave migration.enabled unset and migrate with:\n' +
      '  pnpm --filter grant-aws-deploy migrate -c dbUrlSecretArn=<arn>\n' +
      'which runs the same `node dist/migrate.js` against the same database.'
  );
}

/**
 * An adopter's database security group only means something with their VPC.
 *
 * `network.databaseSecurityGroup` opens their group to `DatabaseClients`, and that
 * rule names a source group and a target group. Supply the group without
 * `network.vpc` and the stack builds a VPC of its own, so the source lives in one VPC
 * and the target in another — a rule CloudFormation refuses, halfway through a deploy,
 * after the VPC and NAT gateway already exist.
 *
 * `bin/grant.ts` refuses the same mistake lexically, one flag earlier. This is the
 * props-level twin, and it exists because the story has now been bitten twice by a
 * refusal living at one configuration boundary and not the other — F10, then F-A. ADR
 * 0005 invites an adopter to replace `bin/` entirely, so a guard that lives only there
 * is a guard the documented path walks straight past.
 */
export function assertNetworkSelection(props: Pick<GrantPlatformProps, 'network'>): void {
  if (!props.network?.databaseSecurityGroup || props.network.vpc) return;

  throw new ConfigurationError(
    'network.databaseSecurityGroup was supplied without network.vpc. The stack would ' +
      'build a VPC of its own and then write an ingress rule whose source is a security ' +
      'group in it and whose target is a group in yours — and CloudFormation refuses a ' +
      'rule spanning two VPCs, partway through the deploy.\n' +
      'Pass the VPC that group belongs to as `network.vpc`, or drop ' +
      '`databaseSecurityGroup` and open your database to the stack yourself.'
  );
}

/**
 * Asserts that a deployment configured to send mail can be given a scoped grant.
 *
 * `ses:SendEmail` is granted only where mail is actually sent, and only for one
 * identity and one From address. Both facts have to be known at synth for the policy
 * to say them, so this refuses the two configurations where they are not:
 *
 *   - `EMAIL_PROVIDER=ses` with no `EMAIL_FROM`. `apps/api` already refuses this at
 *     boot (`env.config.ts:970`); moving the same refusal here costs a synth instead
 *     of a deploy plus a cold start.
 *   - `EMAIL_PROVIDER=ses` with no `email.sesIdentityArn`. An address is not an
 *     identity — `no-reply@example.com` may be verified as the mailbox or as the
 *     domain, and only the adopter knows which — so this library will not construct
 *     the ARN from the address it was given.
 *
 * The reverse case, an identity ARN under `EMAIL_PROVIDER=console`, is deliberately
 * *not* refused: it is an inert prop rather than a broken deployment, and a config
 * file that carries the ARN through a provider switch is a reasonable thing to have.
 *
 * Not a check that the identity exists or is verified — nothing at synth can know
 * that, and an unverified identity fails at send time regardless of this policy.
 */
export function assertSesSendingIdentity(env: GrantEnv, email: EmailProps | undefined): void {
  if (env.EMAIL_PROVIDER !== 'ses') return;

  if (!env.EMAIL_FROM) {
    throw new ConfigurationError(
      'EMAIL_PROVIDER is "ses" but EMAIL_FROM is unset. The API refuses to boot ' +
        'without it, and the SES grant is scoped to it — so without it this deploy ' +
        'would produce a function that cannot send and a policy that cannot say what ' +
        'it may send as.\n' +
        'Pass -c emailFrom=<address>, or set EMAIL_FROM in the config file.'
    );
  }

  if (!email?.sesIdentityArn) {
    throw new ConfigurationError(
      'EMAIL_PROVIDER is "ses" but no email.sesIdentityArn was supplied, so the ' +
        'sending grant has no identity to be scoped to. It is not derived from ' +
        `EMAIL_FROM (${env.EMAIL_FROM}) because an address does not say whether the ` +
        'verified identity is the mailbox or its domain.\n' +
        'Pass -c sesIdentityArn=arn:<partition>:ses:<region>:<account>:identity/<name>, ' +
        "or use the reference app's -c emailFrom, which composes the domain-identity ARN."
    );
  }

  validateSesIdentityArn(email.sesIdentityArn);
}

/**
 * Asserts an ARN that names an SES identity.
 *
 * Lexical only, for the same reason `validateCertificateArn` is: the ARN goes straight
 * into a policy `Resource`, where a malformed one is accepted by CloudFormation and
 * surfaces as `AccessDenied` on the first email the platform tries to send — long
 * after the deploy said it succeeded, and on a path nobody is watching.
 */
export function validateSesIdentityArn(arn: string): void {
  // arn:<partition>:ses:<region>:<account>:identity/<name>
  const segments = arn.split(':');
  const [prefix, , service] = segments;
  const resource = segments[5];

  if (prefix !== 'arn' || service !== 'ses' || segments.length < 6) {
    throw new ConfigurationError(
      `Not an SES ARN: ${arn}\n` + 'Expected arn:<partition>:ses:<region>:<account>:identity/<name>'
    );
  }

  if (!resource?.startsWith('identity/') || resource === 'identity/') {
    throw new ConfigurationError(
      `Not an SES *identity* ARN: ${arn}\n` +
        'Expected the resource part to be identity/<domain-or-address>. A configuration ' +
        'set or a template ARN is not something ses:SendEmail can be scoped to.'
    );
  }
}

/**
 * PostgreSQL's reserved key words, from the "reserved" column of the engine's
 * keyword appendix.
 *
 * Safe to hold locally only because the construct pins the engine: `Database` builds
 * `DatabaseClusterEngine.auroraPostgres`, so this list cannot be wrong for some other
 * engine an adopter chose. If it were engine-dependent it would not belong here.
 */
const POSTGRES_RESERVED_WORDS = new Set([
  'all',
  'analyse',
  'analyze',
  'and',
  'any',
  'array',
  'as',
  'asc',
  'asymmetric',
  'both',
  'case',
  'cast',
  'check',
  'collate',
  'column',
  'constraint',
  'create',
  'current_catalog',
  'current_date',
  'current_role',
  'current_time',
  'current_timestamp',
  'current_user',
  'default',
  'deferrable',
  'desc',
  'distinct',
  'do',
  'else',
  'end',
  'except',
  'false',
  'fetch',
  'for',
  'foreign',
  'from',
  'grant',
  'group',
  'having',
  'in',
  'initially',
  'intersect',
  'into',
  'lateral',
  'leading',
  'limit',
  'localtime',
  'localtimestamp',
  'not',
  'null',
  'offset',
  'on',
  'only',
  'or',
  'order',
  'placing',
  'primary',
  'references',
  'returning',
  'select',
  'session_user',
  'some',
  'symmetric',
  'table',
  'then',
  'to',
  'trailing',
  'true',
  'union',
  'unique',
  'user',
  'using',
  'variadic',
  'when',
  'where',
  'window',
  'with',
]);

/** RDS accepts a letter followed by up to 62 letters, digits or underscores. */
const DATABASE_NAME_SHAPE = /^[A-Za-z][A-Za-z0-9_]{0,62}$/;

/**
 * Asserts a database name RDS will actually accept.
 *
 * RDS validates `DatabaseName` at **create** time, not against the template, so an
 * invalid name synthesizes green, deploys, and fails minutes later — after the VPC
 * and NAT gateway exist — then rolls back. That is a false pass from the one gate
 * this repo can run in CI, which is why it is checked here.
 *
 * The reserved word is the case a real deploy hit (`grant`). The shape rule is the
 * likelier one: `grant-db` reads as an obvious name and a hyphen is rejected just as
 * hard.
 *
 * This does not replace the API's own validation, and is not trying to. If AWS ever
 * rejects a name this accepts, its error still names the cause exactly — this only
 * moves the common cases from minutes-deep to instant.
 */
export function validateDatabaseName(name: string): string {
  // A token means the name is resolved at deploy time; there is nothing to inspect.
  if (Token.isUnresolved(name)) return name;

  if (!DATABASE_NAME_SHAPE.test(name)) {
    throw new ConfigurationError(
      `databaseName must start with a letter and contain only letters, digits or underscores, ` +
        `up to 63 characters — RDS rejects anything else when it creates the cluster, not at ` +
        `synth (received: ${name})`
    );
  }

  if (POSTGRES_RESERVED_WORDS.has(name.toLowerCase())) {
    throw new ConfigurationError(
      `databaseName "${name}" is a reserved word in PostgreSQL, and RDS refuses it when it ` +
        `creates the cluster. Pick another name, e.g. "${name.toLowerCase()}_db".`
    );
  }

  return name;
}
