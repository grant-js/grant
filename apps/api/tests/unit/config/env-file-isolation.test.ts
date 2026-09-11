import { loadEnv } from '@grantjs/env';
import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { afterEach, describe, expect, it, vi } from 'vitest';

/**
 * `loadEnv` reads the `.env` hierarchy with `override: true`, so a value in a file
 * beats one already in `process.env` — including one a test just stubbed. At
 * runtime that is correct: a container's `env_file` should win over a stale export.
 * Under test it means the suite's result depends on a gitignored file, so it passes
 * in CI (which has no `.env`) and fails on a developer machine whose file happens to
 * set the key under test.
 *
 * `vitest.config.ts` sets `GRANT_ENV_SKIP_FILES=true` for the whole unit lane. These
 * two assertions are what make that flag more than a comment: without the opt-out the
 * file wins, with it the file is not read at all.
 */
const MARKER = 'GRANT_ENV_ISOLATION_MARKER';

let roots: string[] = [];

async function rootWithEnvFile(value: string): Promise<string> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'grant-env-isolation-'));
  await fs.writeFile(path.join(root, '.env'), `${MARKER}=${value}\n`);
  roots.push(root);
  return root;
}

afterEach(async () => {
  vi.unstubAllEnvs();
  delete process.env[MARKER];
  await Promise.all(roots.map((root) => fs.rm(root, { recursive: true, force: true })));
  roots = [];
});

describe('loadEnv and the developer .env', () => {
  it('reads the file, and overrides what is already in the environment', async () => {
    // The behaviour the flag exists to suppress. Asserted first, so the flag is
    // demonstrably suppressing something rather than guarding against nothing.
    const root = await rootWithEnvFile('from-the-file');
    vi.stubEnv('GRANT_ENV_SKIP_FILES', '');
    vi.stubEnv(MARKER, 'from-the-test');

    loadEnv(root);

    expect(process.env[MARKER]).toBe('from-the-file');
  });

  it('does not read the file when GRANT_ENV_SKIP_FILES is set', async () => {
    const root = await rootWithEnvFile('from-the-file');
    vi.stubEnv('GRANT_ENV_SKIP_FILES', 'true');
    vi.stubEnv(MARKER, 'from-the-test');

    loadEnv(root);

    expect(process.env[MARKER]).toBe('from-the-test');
  });
});
