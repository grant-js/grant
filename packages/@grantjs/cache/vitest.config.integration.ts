import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    // Integration lane: requires the e2e stack's backing services. Started by
    // scripts/e2e.sh, or directly:
    //   docker compose -f docker-compose.e2e.yml --env-file .env.test \
    //     -p grant-e2e up -d redis localstack
    include: ['src/**/*.integration.test.ts'],
    exclude: ['node_modules', 'dist'],
  },
});
