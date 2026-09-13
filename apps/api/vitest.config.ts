import tsconfigPaths from 'vite-tsconfig-paths';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    environment: 'node', // Node environment for API testing
    // Unit tests read their environment from `vi.stubEnv`, not from the machine.
    // `@grantjs/env` loads the `.env` hierarchy with `override: true`, so without
    // this a developer's gitignored `.env` silently beats what a test stubbed — and
    // the suite passes in CI (which has no `.env`) while failing locally for anyone
    // whose file happens to set the key under test. The e2e lane has its own config
    // and still loads `.env.test`, which it needs.
    env: { GRANT_ENV_SKIP_FILES: 'true' },
    include: ['**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    exclude: ['node_modules', 'dist', '.next', '.vercel', 'tests/e2e/**'],
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
});
