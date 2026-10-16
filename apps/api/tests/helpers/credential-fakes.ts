/**
 * In-memory stand-ins for the credential and lockout repositories (ADR 0011), with the
 * semantics of the real ones. The SQL itself is covered against PostgreSQL in
 * `credentials.postgres.integration.test.ts`.
 */
import type {
  CredentialLockoutPolicy,
  CredentialLockoutState,
  CredentialRecord,
  CredentialScope,
  CredentialWithHash,
  ICredentialLockoutRepository,
  ICredentialRepository,
  ProjectCredentialScope,
} from '@grantjs/core';

/**
 * The platform connection, passing the caller's transaction straight through. The real one
 * (`BasePoolPlatformCredentialConnection`) joins an unrestricted caller or opens its own
 * transaction; service-level behaviour is the same, so these tests don't model the pool.
 */
export const passThroughPlatformConnection = {
  transaction: <T>(caller: unknown, work: (tx: never) => Promise<T>): Promise<T> =>
    work(caller as never),
};

/** In-memory credential repository with one live row per key, like the real ones. */
export class FakeCredentialRepository implements ICredentialRepository<CredentialScope> {
  rows: Array<CredentialWithHash & { deletedAt: Date | null }> = [];
  findActiveCalls = 0;

  private match(scope: CredentialScope, userId: string) {
    return (row: { userId: string; projectId: string | null; deletedAt: Date | null }) =>
      row.deletedAt === null &&
      row.userId === userId &&
      row.projectId === (scope.scope === 'project' ? scope.projectId : null);
  }

  private toRecord(row: CredentialWithHash): CredentialRecord {
    const { hash: _hash, ...record } = row;
    return record;
  }

  async findActive(scope: CredentialScope, userId: string) {
    this.findActiveCalls += 1;
    const row = this.rows.find(this.match(scope, userId));
    return row ? { ...row } : null;
  }

  async lockActive(scope: CredentialScope, userId: string) {
    return this.findActive(scope, userId);
  }

  async findActiveMany(scope: ProjectCredentialScope, userIds: readonly string[]) {
    return this.rows
      .filter((row) => userIds.includes(row.userId) && this.match(scope, row.userId)(row))
      .map((row) => ({ ...row }));
  }

  async upsertImported(
    scope: ProjectCredentialScope,
    input: { userId: string; hash: string; source: never }
  ) {
    const existing = this.rows.find(this.match(scope, input.userId));
    if (existing && existing.source !== 'cdm-import') return null;
    return this.upsert(scope, input);
  }

  async upsert(scope: CredentialScope, input: { userId: string; hash: string; source: never }) {
    const existing = this.rows.find(this.match(scope, input.userId));
    if (existing) {
      Object.assign(existing, { hash: input.hash, source: input.source });
      return this.toRecord(existing);
    }
    const row = {
      id: `cred-${this.rows.length + 1}`,
      scope: scope.scope,
      projectId: scope.scope === 'project' ? scope.projectId : null,
      userId: input.userId,
      hash: input.hash,
      source: input.source,
      lastUsedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    } satisfies CredentialWithHash & { deletedAt: Date | null };
    this.rows.push(row);
    return this.toRecord(row);
  }

  async touchLastUsed(scope: CredentialScope, userId: string, at: Date) {
    const row = this.rows.find(this.match(scope, userId));
    if (row) row.lastUsedAt = at;
  }

  async softDelete(scope: CredentialScope, userId: string) {
    const row = this.rows.find(this.match(scope, userId));
    if (!row) return null;
    row.deletedAt = new Date();
    return this.toRecord(row);
  }

  async softDeleteAllForUser() {
    return [];
  }

  async listActiveForUser() {
    return [];
  }

  async purgeSoftDeleted() {
    return 0;
  }
}

/** The counter rules of the SQL in `credential-lockouts.repository.ts`, on a map. */
export class FakeLockoutRepository implements ICredentialLockoutRepository<ProjectCredentialScope> {
  rows = new Map<
    string,
    { failedAttempts: number; windowStartedAt: Date; lockedUntil: Date | null }
  >();
  recordCalls: string[] = [];

  private key(scope: ProjectCredentialScope, userId: string) {
    return `${scope.projectId}:${userId}`;
  }

  async recordFailure(
    scope: ProjectCredentialScope,
    userId: string,
    policy: CredentialLockoutPolicy,
    now: Date
  ): Promise<CredentialLockoutState> {
    this.recordCalls.push(this.key(scope, userId));
    const key = this.key(scope, userId);
    const row = this.rows.get(key);
    const lockActive = row?.lockedUntil != null && row.lockedUntil.getTime() > now.getTime();
    const restarts =
      !row ||
      (!lockActive && row.lockedUntil !== null && row.lockedUntil.getTime() <= now.getTime()) ||
      row.windowStartedAt.getTime() < now.getTime() - policy.windowMs;
    const failedAttempts = restarts ? 1 : row.failedAttempts + 1;
    const lockedUntil = lockActive
      ? row.lockedUntil
      : failedAttempts >= policy.maxAttempts
        ? new Date(now.getTime() + policy.lockDurationMs)
        : null;
    this.rows.set(key, {
      failedAttempts,
      windowStartedAt: restarts ? now : row.windowStartedAt,
      lockedUntil,
    });
    return { failedAttempts, lockedUntil };
  }

  async getState(scope: ProjectCredentialScope, userId: string) {
    const row = this.rows.get(this.key(scope, userId));
    return row ? { failedAttempts: row.failedAttempts, lockedUntil: row.lockedUntil } : null;
  }

  async reset(scope: ProjectCredentialScope, userId: string) {
    this.rows.delete(this.key(scope, userId));
  }

  async resetAllForUser(userId: string) {
    for (const key of [...this.rows.keys()]) {
      if (key.endsWith(`:${userId}`)) this.rows.delete(key);
    }
  }
}
