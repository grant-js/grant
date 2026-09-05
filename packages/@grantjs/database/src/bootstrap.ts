import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { migrate } from 'drizzle-orm/postgres-js/migrator';

import type { PooledDatabase } from './connection';
import { ensureRlsRestrictedRoleMembership } from './grant-rls-login-role.lib';
import { seedAll } from './scripts/seed-permissions';
import { ensureSystemUserAndSigningKey } from './seed-core';
import { withSessionAdvisoryLock } from './with-session-advisory-lock.lib';

const LOCK_NAME_BOOTSTRAP = 'grant-db-bootstrap';

/**
 * `override` exists for builds where this module no longer sits next to the
 * `migrations/` directory it ships with — a bundle inlines it into one output
 * file, so `import.meta.url` points at that file rather than at the package.
 * Callers that pass nothing keep the on-disk resolution.
 */
function resolveMigrationsFolder(override?: string): string {
  if (override) {
    return override;
  }
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  return path.join(__dirname, 'migrations');
}

export type BootstrapOptions = {
  /** Absolute path to the Drizzle migrations folder. */
  readonly migrationsFolder?: string;
};

/**
 * Bootstrap database schema + core platform seed data.
 *
 * - Safe to run on every container start (idempotent via Drizzle migration history + idempotent seeding).
 * - Coordinated across replicas using a session-pinned PostgreSQL advisory lock.
 * - After migrations, grants `SECURITY_RLS_ROLE` to the DB login user (same as CLI `db:grant-rls-role`).
 */
export async function bootstrapDatabase(
  db: PooledDatabase,
  systemUserId: string,
  options: BootstrapOptions = {}
): Promise<void> {
  await withSessionAdvisoryLock(db, LOCK_NAME_BOOTSTRAP, async () => {
    const migrationsFolder = resolveMigrationsFolder(options.migrationsFolder);

    // Apply any pending migrations (migration history table prevents re-applying).
    await migrate(db, { migrationsFolder });

    // Match CLI `db:migrate`: migration 0042+ does not GRANT the restricted role to a login user.
    await ensureRlsRestrictedRoleMembership();

    // Ensure we never end up with a half-seeded core model.
    await db.transaction(async (tx) => {
      await ensureSystemUserAndSigningKey(tx, systemUserId);
      await seedAll(tx);
    });
  });
}
