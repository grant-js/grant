/**
 * Migrates a database this stack does not own, from an operator's machine.
 *
 *   pnpm --filter grant-aws-deploy migrate -c dbUrlSecretArn=<arn>
 *   GRANT_DB_URL_SECRET_ARN=<arn> pnpm --filter grant-aws-deploy migrate
 *
 * Add `-c image=<ref>` (or `GRANT_API_IMAGE`) to run a pre-published image instead of
 * building one, which is the same choice `migration.image` offers the stack.
 *
 * The deploy-time migration is a Fargate one-shot and a task needs subnets, so the
 * bring-your-own topology with no VPC has nowhere to run it. This is that topology's
 * migration path, and it is a built command rather than an instruction in a guide
 * because a guide that tells you to run `node dist/migrate.js` yourself is not a
 * migration path — it is the absence of one.
 *
 * It runs the **same** entrypoint against the **same** secret the stack references, in
 * the same image (ADR 0003), so the two topologies do not diverge on what a migration
 * is: migrations, the RLS role grant and the core seed in one idempotent,
 * advisory-locked pass (`apps/api/src/migrate.ts`). The environment comes from
 * `AWS_TARGET_ENV_DEFAULTS` — imported, not restated, so this command and the stack
 * cannot drift apart.
 *
 * Shells out to the AWS CLI and to Docker rather than taking an SDK dependency: this
 * is a construct library whose runtime dependencies are `aws-cdk-lib` and
 * `constructs`, and an operator running a deploy already has both. Same reasoning as
 * `put-secrets.ts`.
 *
 * **Values are never printed. Key names are.** The connection string is passed to the
 * container through this process's own environment (`docker run -e DB_URL`, with no
 * `=value`) rather than on the command line, because argv is readable by any local
 * user through `/proc`.
 */

import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { AWS_TARGET_ENV_DEFAULTS } from '../lib/config/defaults';

/** The build context is the workspace root, exactly as `ApiImage` uses it. */
const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '../../..');

/**
 * Built when no image is named, mirroring what the stack does with no
 * `migration.image`. `runner-lambda` is the same target `ApiImage` builds: the Lambda
 * Web Adapter it carries is inert wherever the Lambda runtime is not reading
 * `/opt/extensions`, and the `tsc` output every explicit command override runs — this
 * one included — is still in the image.
 */
const LOCAL_IMAGE_TAG = 'grant-api:migrate-local';

/** Where `apps/api/Dockerfile` leaves the working directory. */
const MIGRATE_COMMAND = ['node', 'dist/migrate.js'];

/** The key the platform secret holds `DB_URL` under, if the secret is that shape. */
const DB_URL_KEY = 'DB_URL';

/**
 * Reads `-c key=value` from argv, matching the CDK context flags the same ARN is
 * passed to `cdk deploy` with — so the two commands are typed the same way. A bare
 * `--` is tolerated because `pnpm run` forwards one when it is used.
 */
function context(argv: string[]): Record<string, string> {
  const found: Record<string, string> = {};
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] !== '-c' && argv[i] !== '--context') continue;
    const pair = argv[i + 1];
    if (pair === undefined) continue;
    const separator = pair.indexOf('=');
    if (separator > 0) found[pair.slice(0, separator)] = pair.slice(separator + 1);
    i += 1;
  }
  return found;
}

function run(command: string, args: string[], env?: NodeJS.ProcessEnv): void {
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    ...(env ? { env } : {}),
  });
  if (result.error) {
    throw new Error(`${command} could not be started: ${result.error.message}`);
  }
  if (result.status !== 0) {
    throw new Error(`${command} ${args[0]} exited ${String(result.status)}`);
  }
}

function aws(args: string[]): string {
  const result = spawnSync('aws', args, { encoding: 'utf-8' });
  if (result.status !== 0) {
    throw new Error(`aws ${args.slice(0, 2).join(' ')} failed: ${result.stderr?.trim()}`);
  }
  return result.stdout.trim();
}

/**
 * Pins the AWS CLI to the region in the ARN, when an ARN is what was passed.
 *
 * `cdk deploy` validates this same flag against the stack's account and region
 * (`validateSecretArn` in `lib/config/validate.ts`); this command validated nothing and
 * passed no `--region`, so it resolved against whatever the operator's profile defaults
 * to. Same flag name, two different constraint sets — and the failure is quiet: a
 * default region holding a same-named secret migrates the wrong database. Gate 4,
 * finding L-2.
 *
 * A bare secret *name* stays supported and unpinned, because it is a legitimate thing
 * to pass — `DatabaseSecretName` is published as a name, not an ARN — and a name
 * carries no region to pin to.
 */
function regionOf(secretId: string): string[] {
  if (!secretId.startsWith('arn:')) return [];

  // arn:<partition>:secretsmanager:<region>:<account>:secret:<name>-<suffix>
  const segments = secretId.split(':');
  const [, , service, region, , resource] = segments;

  if (service !== 'secretsmanager' || resource !== 'secret' || segments.length < 7 || !region) {
    throw new Error(
      `Not a Secrets Manager secret ARN: ${secretId}\n` +
        'Expected arn:<partition>:secretsmanager:<region>:<account>:secret:<name>-<suffix>, ' +
        'the same ARN `cdk deploy -c dbUrlSecretArn=...` takes, or a bare secret name.'
    );
  }

  return ['--region', region];
}

/**
 * The connection string, from the secret the stack was given.
 *
 * Two shapes are accepted because two secrets legitimately hold this value: the one
 * `-c dbUrlSecretArn` names is a plain connection string (`.env.example` says to store
 * it that way), and the platform secret the stack creates is a JSON object of
 * `ENV_NAME: value` with `DB_URL` among them. Pointing at either is a reasonable thing
 * for an operator to do, and guessing wrong costs a confusing failure deep inside the
 * container rather than here.
 */
function readDatabaseUrl(secretId: string): string {
  const secretString = aws([
    'secretsmanager',
    'get-secret-value',
    '--secret-id',
    secretId,
    ...regionOf(secretId),
    '--query',
    'SecretString',
    '--output',
    'text',
  ]);

  let url = secretString;
  if (secretString.startsWith('{')) {
    const parsed = JSON.parse(secretString) as Record<string, unknown>;
    const value = parsed[DB_URL_KEY];
    if (typeof value !== 'string' || value === '') {
      throw new Error(
        `Secret ${secretId} is a JSON object with no ${DB_URL_KEY} key. Point at the ` +
          'secret holding the connection string, or at the platform secret this stack ' +
          `publishes as its DatabaseSecretName output — those are the two shapes with a ${DB_URL_KEY}.`
      );
    }
    console.log(`[migrate] Read ${DB_URL_KEY} from a JSON secret.`);
    url = value;
  } else {
    console.log('[migrate] Read a plain connection string.');
  }

  // Deliberately does not echo the value: it is a connection string, and this message
  // goes to a terminal and possibly a CI log. Same rule `PlatformSecret` applies at
  // synth, for the same reason.
  if (!/^postgres(ql)?:\/\//.test(url.trim())) {
    throw new Error(
      `Secret ${secretId} does not hold a PostgreSQL connection string — it must begin ` +
        'with postgresql:// or postgres://.'
    );
  }

  return url.trim();
}

function main(): void {
  const flags = context(process.argv.slice(2));
  const secretId = flags.dbUrlSecretArn ?? process.env.GRANT_DB_URL_SECRET_ARN;

  if (!secretId) {
    throw new Error(
      'No database secret named. Pass the ARN of the Secrets Manager secret holding the ' +
        'connection string, the same one the stack is deployed with:\n' +
        '  pnpm --filter grant-aws-deploy migrate -c dbUrlSecretArn=<arn>\n' +
        '  GRANT_DB_URL_SECRET_ARN=<arn> pnpm --filter grant-aws-deploy migrate'
    );
  }

  const url = readDatabaseUrl(secretId);

  let image = flags.image ?? process.env.GRANT_API_IMAGE;
  if (!image) {
    image = LOCAL_IMAGE_TAG;
    console.log(`[migrate] No image named; building ${image} from ${REPO_ROOT}.`);
    run('docker', [
      'build',
      '--file',
      join(REPO_ROOT, 'apps/api/Dockerfile'),
      '--target',
      'runner-lambda',
      '--tag',
      image,
      REPO_ROOT,
    ]);
  }

  // The stack's own migration declares the provider it actually uses rather than the
  // one the serving function needs: `validateConfig()` validates the whole surface
  // regardless of the entrypoint, so `s3` would demand a bucket from a task that opens
  // no object storage. `env` for the resolver because there is no platform secret in
  // reach here — the URL is already resolved, and this is the one place it is held.
  const environment: Record<string, string> = {
    ...AWS_TARGET_ENV_DEFAULTS,
    SECRETS_PROVIDER: 'env',
    STORAGE_PROVIDER: 'local',
  };

  const args = ['run', '--rm', '--env', DB_URL_KEY];
  for (const key of Object.keys(environment)) {
    args.push('--env', key);
  }
  args.push(image, ...MIGRATE_COMMAND);

  console.log(
    `[migrate] Running ${MIGRATE_COMMAND.join(' ')} in ${image} with ` +
      `${String(Object.keys(environment).length + 1)} key(s): ` +
      `${[DB_URL_KEY, ...Object.keys(environment)].join(', ')}`
  );

  // Names only on the command line; the values reach the container through this
  // process's environment, which `docker run --env KEY` reads.
  run('docker', args, { ...process.env, ...environment, [DB_URL_KEY]: url });

  console.log(
    '[migrate] Done. The same pass a deploy-time Fargate migration runs: migrations,\n' +
      '          the RLS role grant and the core seed, under one advisory lock. Safe to\n' +
      '          run again — it is idempotent.'
  );
}

main();
