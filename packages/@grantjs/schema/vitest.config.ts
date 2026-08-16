import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.{test,spec}.ts'],
    // src/generated is codegen output guarded by `pnpm codegen:check`, not by tests.
    exclude: ['node_modules', 'dist', 'src/generated/**'],
  },
});
