import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    // Integration lane: requires the e2e stack's LocalStack.
    include: ['src/**/*.integration.test.ts'],
    exclude: ['node_modules', 'dist'],
  },
});
