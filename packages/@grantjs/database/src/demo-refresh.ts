import { sql } from 'drizzle-orm';
import { reset } from 'drizzle-seed';

import type { DbSchema } from './connection';
import { resetTables } from './scripts/reset-db';
import { seedAll } from './scripts/seed-permissions';
import { ensureSystemUserAndSigningKey } from './seed-core';

const LOCK_NAME_DEMO_REFRESH = 'grant-demo-refresh';

/**
 * Terminate backends that have been idle in transaction longer than the given
 * threshold. This prevents stale transactions from holding locks that block
 * the TRUNCATE required by the demo refresh.
 */
async function terminateIdleTransactions(db: DbSchema, thresholdMinutes = 5): Promise<number> {
  const result = await db.execute(sql`
    SELECT pg_terminate_backend(pid)
    FROM pg_stat_activity
    WHERE state = 'idle in transaction'
      AND pid <> pg_backend_pid()
      AND xact_start < now() - make_interval(mins => ${thresholdMinutes})
  `);
  return result.length;
}

/**
 * Reset the database to an empty state and reseed core system data for demo environments.
 *
 * - Terminates stale idle-in-transaction backends to avoid lock contention.
 * - Uses the same table set as the CLI reset script.
 * - Ensures the system user and signing key exist.
 * - Reseeds the permission model.
 */
export async function runDemoRefresh(db: DbSchema, systemUserId: string): Promise<void> {
  // Prevent overlapping demo resets across replicas / rolling updates.
  await db.execute(sql`SELECT pg_advisory_lock(hashtext(${LOCK_NAME_DEMO_REFRESH}));`);

  try {
    const terminated = await terminateIdleTransactions(db);
    if (terminated > 0) {
      await db.execute(sql`SELECT pg_sleep(1)`);
    }

    await reset(db, resetTables);
    await ensureSystemUserAndSigningKey(db, systemUserId);
    await seedAll(db);
  } finally {
    await db.execute(sql`SELECT pg_advisory_unlock(hashtext(${LOCK_NAME_DEMO_REFRESH}));`);
  }
}
