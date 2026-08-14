import type { PooledDatabase } from './connection';

/**
 * Hold a PostgreSQL session-scoped advisory lock for the duration of `fn`.
 *
 * `pg_advisory_lock` / `pg_advisory_unlock` must run on the **same** backend
 * session. Issuing them via a pooled `db.execute` can unlock (or fail to
 * unlock) a different connection than the one that acquired the lock.
 * Reserving one postgres.js connection pins both statements to one session.
 *
 * `fn` still runs against the pool — the lock serializes replicas, it does not
 * pin the work to one connection.
 */
export async function withSessionAdvisoryLock<T>(
  db: PooledDatabase,
  lockName: string,
  fn: () => Promise<T>
): Promise<T> {
  const reserved = await db.$client.reserve();

  try {
    await reserved`SELECT pg_advisory_lock(hashtext(${lockName}))`;

    // Flags, not `!== undefined` on the captured value: `throw undefined` is
    // legal and would otherwise be swallowed, returning an unassigned result.
    let result: T | undefined;
    let failed = false;
    let workError: unknown;
    try {
      result = await fn();
    } catch (error) {
      failed = true;
      workError = error;
    }

    let unlockFailed = false;
    let unlockError: unknown;
    try {
      await reserved`SELECT pg_advisory_unlock(hashtext(${lockName}))`;
    } catch (error) {
      unlockFailed = true;
      unlockError = error;
    }

    // The caller's failure is the interesting one; an unlock failure must not
    // replace a legible migration error with "unlock failed".
    if (failed) throw workError;
    if (unlockFailed) throw unlockError;
    return result as T;
  } finally {
    reserved.release();
  }
}
