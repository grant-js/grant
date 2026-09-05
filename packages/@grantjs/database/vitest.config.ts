import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    // `src/scripts/*` use the `@/*` alias declared in tsconfig.json.
    alias: { '@': path.join(rootDir, 'src') },
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.{test,spec}.ts'],
    exclude: ['node_modules', 'dist', 'src/migrations/**'],
    // `connection.test.ts` re-imports its module under `vi.resetModules()` for every
    // test, so whichever test runs first pays the cold transform of the whole graph
    // inside its own budget. That file already mocks the 110-table schema barrel to
    // cut the cost (see its header comment) and it is still not enough on a loaded
    // self-hosted runner: observed 315 ms locally against 5,089 ms in CI, where vitest
    // reported 13.9 s of transform and 35.1 s of import for the run. The 5 s default
    // is a measure of machine load here rather than of anything the code does, and a
    // timeout that fires on load is a flake that costs a re-run every time.
    //
    // Same reasoning and same value as deploy/aws/vitest.config.ts. These are mocked
    // unit tests that open no socket, so this ceiling still catches a genuine hang.
    testTimeout: 30_000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      // Drizzle table definitions are declarative; they have no branches to cover.
      exclude: ['node_modules/', 'dist/', 'src/migrations/**', '**/*.d.ts', '**/*.config.*'],
    },
  },
});
