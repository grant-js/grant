import type { Sql } from 'postgres';

import type { DbSchema } from './connection';

type DbWithClient = DbSchema & { $client: Sql };

/**
 * Hold a PostgreSQL session-scoped advisory lock for the duration of `fn`.
 *
 * `pg_advisory_lock` / `pg_advisory_unlock` must run on the **same** backend
 * session. Issuing them via a pooled `db.execute` can unlock (or fail to
 * unlock) a different connection than the one that acquired the lock.
 * Reserving one postgres.js connection pins both statements to one session.
 */
export async function withSessionAdvisoryLock<T>(
  db: DbSchema,
  lockName: string,
  fn: () => Promise<T>
): Promise<T> {
  const reserved = await (db as DbWithClient).$client.reserve();

  try {
    await reserved`SELECT pg_advisory_lock(hashtext(${lockName}))`;

    let result: T;
    let workError: unknown;
    try {
      result = await fn();
    } catch (error) {
      workError = error;
    }

    let unlockError: unknown;
    try {
      await reserved`SELECT pg_advisory_unlock(hashtext(${lockName}))`;
    } catch (error) {
      unlockError = error;
    }

    if (workError !== undefined) throw workError;
    if (unlockError !== undefined) throw unlockError;
    return result!;
  } finally {
    reserved.release();
  }
}
