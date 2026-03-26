import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { sql } from 'drizzle-orm';
import { migrate } from 'drizzle-orm/postgres-js/migrator';

import type { DbSchema } from './connection';
import { seedAll } from './scripts/seed-permissions';
import { ensureSystemUserAndSigningKey } from './seed-core';

const LOCK_NAME_BOOTSTRAP = 'grant-db-bootstrap';

function resolveMigrationsFolder(): string {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  return path.join(__dirname, 'migrations');
}

/**
 * Bootstrap database schema + core platform seed data.
 *
 * - Safe to run on every container start (idempotent via Drizzle migration history + idempotent seeding).
 * - Coordinated across replicas using PostgreSQL advisory lock.
 */
export async function bootstrapDatabase(db: DbSchema, systemUserId: string): Promise<void> {
  // Ensure all replicas serialize migrations + core seed.
  await db.execute(sql`SELECT pg_advisory_lock(hashtext(${LOCK_NAME_BOOTSTRAP}));`);

  try {
    const migrationsFolder = resolveMigrationsFolder();

    // Apply any pending migrations (migration history table prevents re-applying).
    await migrate(db, { migrationsFolder });

    // Ensure we never end up with a half-seeded core model.
    await db.transaction(async (tx) => {
      await ensureSystemUserAndSigningKey(tx, systemUserId);
      await seedAll(tx);
    });
  } finally {
    await db.execute(sql`SELECT pg_advisory_unlock(hashtext(${LOCK_NAME_BOOTSTRAP}));`);
  }
}
