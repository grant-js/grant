import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/e2e/**/*.e2e.test.ts'],
    exclude: ['node_modules', 'dist'],
    // Run test FILES one at a time – parallel files overwhelm the single API container
    fileParallelism: false,
    // Within each file, tests run sequentially (they depend on each other: register → login → etc.)
    sequence: { concurrent: false },
    // Generous timeout for container-based tests (each TestUser.create() makes 3-4 HTTP calls)
    testTimeout: 60_000,
    hookTimeout: 120_000,
    // Single setup file for env loading and health check
    setupFiles: ['tests/e2e/setup.ts'],
  },
});
