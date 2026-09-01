/**
 * Applies the secret-marked keys from the target's env file to the platform secret.
 *
 *   pnpm --filter grant-aws-deploy put-secrets
 *
 * These keys deliberately never enter the CloudFormation template: CloudFormation
 * cannot hold a literal secret without it being readable by anyone who can describe
 * the stack. The application resolves them through `ISecretResolver`, so writing them
 * here takes effect within the resolver's TTL — no redeploy, no restart. That is the
 * property ADR 0004 bought, and this script is what spends it.
 *
 * Shells out to the AWS CLI rather than taking an SDK dependency: this is a construct
 * library whose runtime dependencies are `aws-cdk-lib` and `constructs`, and an
 * operator running a deploy already has the CLI and a configured profile.
 *
 * Values are never printed. Key names are.
 */

import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { loadTargetConfig } from '../lib/config/env-file';

const HERE = dirname(fileURLToPath(import.meta.url));
const DEFAULT_ENV_FILE = join(HERE, '../.env');

function aws(args: string[]): string {
  const result = spawnSync('aws', args, { encoding: 'utf-8' });
  if (result.status !== 0) {
    throw new Error(`aws ${args.slice(0, 2).join(' ')} failed: ${result.stderr?.trim()}`);
  }
  return result.stdout.trim();
}

function readSecret(secretId: string): Record<string, string> {
  return JSON.parse(
    aws([
      'secretsmanager',
      'get-secret-value',
      '--secret-id',
      secretId,
      '--query',
      'SecretString',
      '--output',
      'text',
    ])
  ) as Record<string, string>;
}

function main(): void {
  const envFile = resolve(process.env.GRANT_ENV_FILE ?? DEFAULT_ENV_FILE);
  const stackName = process.env.GRANT_STACK_NAME ?? 'GrantPlatform';

  const { secrets } = loadTargetConfig(
    envFile,
    (p) => readFileSync(p, 'utf-8'),
    (p) => existsSync(p)
  );

  const keys = Object.keys(secrets);
  if (keys.length === 0) {
    console.log(`[put-secrets] No secret values set in ${envFile}. Nothing to do.`);
    return;
  }

  // The stack publishes the secret's name; the physical id carries a suffix CDK
  // chooses, so it cannot be reconstructed from the logical id alone.
  const outputs = JSON.parse(
    aws([
      'cloudformation',
      'describe-stacks',
      '--stack-name',
      stackName,
      '--query',
      'Stacks[0].Outputs',
      '--output',
      'json',
    ])
  ) as { OutputKey: string; OutputValue: string }[];

  const secretOutput = outputs.find((o) => o.OutputKey.startsWith('GrantDatabaseSecretName'));
  if (!secretOutput) {
    throw new Error(
      `Stack ${stackName} publishes no GrantDatabaseSecretName output. ` +
        'The platform secret is created with the database — this stack may not own one.'
    );
  }
  const secretId = secretOutput.OutputValue;

  // Merge, never replace. The secret already holds DB_URL and ORIGIN_VERIFY_SECRET;
  // overwriting it would take the API offline and break the CloudFront origin check.
  const current = readSecret(secretId);
  const preserved = Object.keys(current).filter((k) => !keys.includes(k));

  aws([
    'secretsmanager',
    'put-secret-value',
    '--secret-id',
    secretId,
    '--secret-string',
    JSON.stringify({ ...current, ...secrets }),
  ]);

  const lost = preserved.filter((k) => !(k in readSecret(secretId)));
  if (lost.length > 0) {
    throw new Error(
      `Pre-existing keys were lost: ${lost.join(', ')}. ` +
        'Restore from a previous version with `aws secretsmanager list-secret-version-ids`.'
    );
  }

  console.log(`[put-secrets] Applied ${keys.length} key(s): ${keys.join(', ')}`);
  console.log(
    `[put-secrets] Preserved ${preserved.length} existing key(s): ${preserved.join(', ')}`
  );
  console.log('[put-secrets] Resolved within SECRETS_CACHE_TTL_SECONDS; no redeploy needed.');
}

main();
