import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    // Unit lane: no infrastructure. See vitest.config.integration.ts.
    include: ['src/**/*.{test,spec}.ts'],
    exclude: ['node_modules', 'dist', 'src/**/*.integration.test.ts'],
  },
});
