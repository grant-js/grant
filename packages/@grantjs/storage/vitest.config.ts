import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    // Unit lane: no infrastructure. The S3 adapter is exercised here too — presigning
    // is local computation against static credentials, so the URL a real PUT would go
    // to is checkable offline. What only a real bucket can prove (that S3 *enforces*
    // the conditions the URL carries) lives in *.integration.test.ts and runs against
    // LocalStack via vitest.config.integration.ts, the same split @grantjs/cache uses.
    include: ['src/**/*.{test,spec}.ts'],
    exclude: ['node_modules', 'dist', 'src/**/*.integration.test.ts'],
  },
});
