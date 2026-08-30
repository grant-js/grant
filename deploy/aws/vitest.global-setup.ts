/**
 * Confines CDK asset staging to one removable directory per test run, and removes it
 * afterwards.
 *
 * Synthesizing a stack with an asset makes CDK stage that asset under a temporary
 * directory. When an `App` is constructed without an explicit `outdir` — which every
 * test here does, deliberately, so runs cannot contend for a shared one — CDK creates
 * that directory with `mkdtemp` under `os.tmpdir()` and never removes it. The suite
 * has assets (the docs site, and the API image once built), so a full run strands
 * roughly 30 directories and a gigabyte.
 *
 * Nothing reclaims them. On a developer machine that is untidy; on the self-hosted
 * runner, where `/tmp` is a 31 GB tmpfs shared by every job in the monorepo pipeline,
 * it is a time bomb. It went off: a push failed with `Unknown system error -122`
 * (EDQUOT) after 707 stranded directories had consumed 25 GB, and the failure surfaced
 * as unrelated CDK staging errors in tests that had nothing to do with the change.
 *
 * The fix redirects rather than cleans up after the fact. `TMPDIR` is set for the test
 * workers (see `vitest.config.ts`), `os.tmpdir()` honours it, and so every directory
 * CDK creates lands inside one root this file owns and deletes. Verified by
 * measurement: with `TMPDIR` set, a full run added **zero** directories to `/tmp` and
 * all 33 appeared under the redirected root.
 *
 * A run that is killed rather than completed never reaches teardown, so the next run
 * sweeps anything left behind. That is the durable half — self-healing without a cron
 * job or a pipeline step anyone has to remember.
 */

import { mkdir, readdir, rm, stat } from 'node:fs/promises';
import { dirname, join } from 'node:path';

/**
 * How long a run directory must be untouched before another run may delete it.
 *
 * This is a concurrency guard, not a retention policy. Jobs share the runner, so a
 * directory minutes old may belong to a run that is still going; six hours is far
 * longer than any suite here takes and far shorter than the interval over which
 * stragglers accumulate into a full disk.
 */
const STALE_AFTER_MS = 6 * 60 * 60 * 1000;

/** Only ever removes directories this suite names. */
const RUN_DIR_PREFIX = 'run-';

async function sweepStale(root: string): Promise<void> {
  let entries: string[];
  try {
    entries = await readdir(root);
  } catch {
    // First run on this machine: nothing to sweep.
    return;
  }

  const cutoff = Date.now() - STALE_AFTER_MS;
  await Promise.all(
    entries
      .filter((name) => name.startsWith(RUN_DIR_PREFIX))
      .map(async (name) => {
        const path = join(root, name);
        try {
          const info = await stat(path);
          if (info.mtimeMs < cutoff) {
            await rm(path, { recursive: true, force: true });
          }
        } catch {
          // Raced with another run's teardown, which is the outcome we wanted anyway.
        }
      })
  );
}

export default async function setup(): Promise<() => Promise<void>> {
  const runDir = process.env.GRANT_CDK_TEST_TMPDIR;
  if (!runDir) {
    // The config computes this. Without it the workers fall back to the real tmpdir
    // and leak as before, so say so rather than fail silently.
    throw new Error(
      'GRANT_CDK_TEST_TMPDIR is unset; vitest.config.ts should have set it before global setup ran'
    );
  }

  await sweepStale(dirname(runDir));
  await mkdir(runDir, { recursive: true });

  return async () => {
    await rm(runDir, { recursive: true, force: true });
  };
}
