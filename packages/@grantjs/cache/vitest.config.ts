import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    // Unit lane: no infrastructure. Suites that need a real backend are
    // *.integration.test.ts and run via vitest.config.integration.ts, the same
    // split apps/api uses for its e2e config.
    include: ['src/**/*.{test,spec}.ts'],
    exclude: ['node_modules', 'dist', 'src/**/*.integration.test.ts'],
  },
});
