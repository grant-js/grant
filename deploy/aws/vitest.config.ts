import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { defineConfig } from 'vitest/config';

/**
 * Where CDK asset staging is allowed to write.
 *
 * Computed here rather than in the global setup because the workers need it as an
 * environment variable, and this file is the only place that reaches both. Published
 * through `process.env` as well so `vitest.global-setup.ts` — which runs in this same
 * process, but is loaded separately — can create and later remove exactly this
 * directory. See that file for why any of this is necessary.
 */
const CDK_TEST_TMPDIR = join(
  tmpdir(),
  'grant-cdk-tests',
  `run-${process.pid}-${Date.now().toString(36)}`
);
process.env.GRANT_CDK_TEST_TMPDIR = CDK_TEST_TMPDIR;

export default defineConfig({
  test: {
    environment: 'node',
    include: ['lib/**/*.test.ts'],
    globalSetup: ['./vitest.global-setup.ts'],
    /**
     * `os.tmpdir()` reads this at call time, so every `mkdtemp` CDK performs while
     * synthesizing lands under a directory the global setup owns and deletes.
     */
    env: { TMPDIR: CDK_TEST_TMPDIR },
    /**
     * Vitest's 5s default is calibrated for unit tests. Every test here synthesizes a
     * CloudFormation template — the data-tier ones build a VPC, an Aurora cluster and a
     * CloudFront distribution, and the first in a file also pays asset staging — which
     * is real CPU-bound work, not I/O that can be awaited faster. On the self-hosted
     * runner, which executes the whole monorepo pipeline concurrently, that work is
     * roughly 10x slower than locally: a 947ms synth measured 9.2s in CI and tripped
     * the default. This is suite-wide rather than per-test because the exposure is, and
     * it grows as later slices add constructs to the same synth.
     */
    testTimeout: 30_000,
  },
});
