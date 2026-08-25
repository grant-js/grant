/**
 * Standalone migrate/seed entrypoint.
 *
 *   node dist/migrate.js
 *
 * Runs the same `bootstrapDatabase()` the server runs at boot — migrations, the RLS
 * role grant, and the core seed — then exits. Idempotent and safe to run
 * concurrently: it takes the same PostgreSQL advisory lock.
 *
 * This exists because the package-level `pnpm --filter @grantjs/database db:migrate`
 * cannot run in the production image. That script shells out to `drizzle-kit`, a
 * **devDependency**, and the runner stage installs production dependencies only
 * (`apps/api/Dockerfile:68`). `bootstrapDatabase()` uses `drizzle-orm`'s migrator,
 * which is a real dependency, so this entrypoint works in the shipped image.
 *
 * Use it wherever `DB_BOOTSTRAP_ON_BOOT=false`: a Helm hook Job, an ECS one-off
 * task, or a CodeBuild step ahead of a Lambda deploy. See
 * `docs/architecture/decisions/0001-configuration-gated-database-bootstrap.md`.
 *
 * Exit codes: 0 on success, 1 on failure — so a Job or task fails loudly rather
 * than letting a deploy proceed against an unmigrated database.
 */

import { bootstrapDatabase, closeDatabase, initializeDBConnection } from '@grantjs/database';

import { config, validateConfig } from '@/config';
import { logger, loggerFactory } from '@/lib/logger';

async function runMigrations(): Promise<void> {
  validateConfig();

  const db = initializeDBConnection({
    connectionString: config.db.url,
    max: config.db.poolMax,
    idleTimeout: config.db.idleTimeout,
    connectTimeout: config.db.connectionTimeout,
    logger: loggerFactory.createLogger('DatabaseConnection'),
  });

  logger.info({ msg: 'Starting database bootstrap' });

  try {
    await bootstrapDatabase(db, config.system.systemUserId);
    logger.info({ msg: 'Database bootstrap complete' });
  } finally {
    await closeDatabase();
  }
}

runMigrations()
  .then(() => {
    process.exit(0);
  })
  .catch((error: unknown) => {
    logger.fatal({
      msg: 'Database bootstrap failed',
      err: error,
    });
    process.exit(1);
  });
