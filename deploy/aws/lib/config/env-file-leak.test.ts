/**
 * The regression this guards against is silent and serious: routing a secret-marked
 * key through `env` instead of the out-of-band path would put a live credential into
 * the CloudFormation template, readable by anyone who can describe the stack. Nothing
 * would fail at deploy — it would just be exposed.
 *
 * Synthesizes for real rather than asserting on `classifyConfig`, because the unit
 * test cannot see how `bin/grant.ts` wires the result.
 */
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const APP_DIR = join(dirname(fileURLToPath(import.meta.url)), '../..');

const SECRET_SENTINEL = 'sentinel-secret-must-never-be-synthesized';
const PUBLIC_SENTINEL = 'sentinel-public-value-should-appear';

function synthWith(envFileContents: string): string {
  const dir = mkdtempSync(join(tmpdir(), 'grant-envfile-'));
  const envFile = join(dir, '.env');
  writeFileSync(envFile, envFileContents);
  const outDir = join(dir, 'out');

  const result = spawnSync(
    'pnpm',
    [
      'exec',
      'cdk',
      'synth',
      '--quiet',
      '-c',
      'appUrl=https://grant.example.com',
      '-c',
      'zoneName=example.com',
      '-c',
      'hostedZoneId=ZREFERENCE00000',
      '-c',
      'account=000000000000',
      '-c',
      'region=eu-central-1',
      '-c',
      `envFile=${envFile}`,
      '--output',
      outDir,
    ],
    { cwd: APP_DIR, encoding: 'utf-8' }
  );

  if (result.status !== 0) {
    throw new Error(`cdk synth failed: ${result.stderr}`);
  }

  return readdirSync(outDir)
    .filter((f) => f.endsWith('.template.json'))
    .map((f) => readFileSync(join(outDir, f), 'utf-8'))
    .join('\n');
}

describe('the env file cannot leak a secret into the template', () => {
  it('synthesizes the public key but not the secret one', () => {
    const templates = synthWith(
      [
        `GITHUB_CLIENT_ID=${PUBLIC_SENTINEL}`,
        `GITHUB_CLIENT_SECRET=${SECRET_SENTINEL}`,
        `AUTH_MFA_SECRET_ENCRYPTION_KEY=${SECRET_SENTINEL}`,
      ].join('\n')
    );

    // Guards against a vacuous pass: if the file were ignored entirely, the secret
    // would also be absent and this test would prove nothing.
    expect(templates).toContain(PUBLIC_SENTINEL);

    expect(templates).not.toContain(SECRET_SENTINEL);
  }, 180_000);
});
