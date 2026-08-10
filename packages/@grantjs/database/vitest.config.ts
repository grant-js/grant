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
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      // Drizzle table definitions are declarative; they have no branches to cover.
      exclude: ['node_modules/', 'dist/', 'src/migrations/**', '**/*.d.ts', '**/*.config.*'],
    },
  },
});
