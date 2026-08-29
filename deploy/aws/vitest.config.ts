import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['lib/**/*.test.ts'],
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
