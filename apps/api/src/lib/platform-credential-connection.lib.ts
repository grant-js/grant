import type { DbSchema } from '@grantjs/database';
import { sql } from 'drizzle-orm';

import { config } from '@/config';
import type { Transaction } from '@/lib/transaction-manager.lib';

/**
 * Where a platform-scope credential operation runs (ADR 0011 § 2, slice 2).
 *
 * `user_credentials` and its lockout and audit tables are core tables with no RLS, so the
 * restricted role of a scoped request (migration 0042) used to be able to read every hash
 * in them. Since slice 2 that role has **no privileges** on those tables, so a platform
 * credential operation cannot run inside a scoped request's transaction. This type is the
 * one place that knows it: the credential and lockout services run every platform-scope
 * operation through it, and nobody else chooses a connection or writes SQL for them.
 *
 * Trade-offs, all deliberate:
 *
 * - Caller's transaction is unrestricted (an unscoped request: login, register, reset, a
 *   job): the operation **joins it**. It commits and rolls back with the caller's writes,
 *   which registration needs (the credential row references the user created a moment
 *   earlier in the same transaction).
 * - Caller's transaction runs as the restricted role (a scoped request): the operation runs
 *   in **its own short transaction on the base pool**. It is not part of the request
 *   transaction (it commits even if the request transaction later rolls back, and cannot see
 *   rows the request transaction has written but not committed), and it holds **one extra
 *   pooled connection** while it runs. With `DB_POOL_MAX=2` on Lambda that is exactly the
 *   second connection; nothing inside such an operation may ask the pool for a third.
 * - Detection reads `current_user`, so it follows what the connection really is, not what a
 *   composition root believed. Registration reached with a scoped token would therefore
 *   fail its foreign key (the user is invisible to the other connection) rather than
 *   write a credential under the wrong role.
 */
export interface PlatformCredentialConnection {
  transaction<T>(
    caller: Transaction | undefined,
    work: (transaction: Transaction) => Promise<T>
  ): Promise<T>;
}

export class BasePoolPlatformCredentialConnection implements PlatformCredentialConnection {
  /** Transactions already known to be unrestricted: ours, and callers' that were probed. */
  private readonly unrestricted = new WeakSet<object>();
  private readonly restricted = new WeakSet<object>();

  constructor(
    private readonly baseDb: DbSchema,
    private readonly restrictedRole: string = config.security.rlsRestrictedRole
  ) {}

  private async runsAsRestrictedRole(transaction: Transaction): Promise<boolean> {
    if (this.unrestricted.has(transaction)) return false;
    if (this.restricted.has(transaction)) return true;

    const rows = (await transaction.execute(sql`SELECT current_user AS "role"`)) as unknown as {
      role?: string;
    }[];
    const isRestricted = rows[0]?.role === this.restrictedRole;
    (isRestricted ? this.restricted : this.unrestricted).add(transaction);
    return isRestricted;
  }

  async transaction<T>(
    caller: Transaction | undefined,
    work: (transaction: Transaction) => Promise<T>
  ): Promise<T> {
    if (caller && !(await this.runsAsRestrictedRole(caller))) {
      return work(caller);
    }
    return this.baseDb.transaction(async (own) => {
      this.unrestricted.add(own);
      return work(own);
    });
  }
}
