import { resolve } from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  // The repo's tsconfig.json sets `jsx: "preserve"` for Next's SWC build; Vitest's Vite 8
  // transform is oxc-based by default and reads that same tsconfig value, so without this
  // override every `.tsx` file that renders JSX fails to parse under the test runner (JSX
  // is left untransformed instead of compiled to `React.createElement`/`jsx()` calls).
  // Scoped to `oxc` (not `esbuild`, which Vite 8 ignores once `oxc` is set) and to this
  // config only, so it doesn't affect the Next.js build.
  oxc: {
    jsx: { runtime: 'automatic' },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: ['**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    exclude: ['node_modules', 'dist', '.next', '.vercel'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        '.next/',
        'tests/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/*.setup.*',
      ],
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './'),
    },
  },
});
