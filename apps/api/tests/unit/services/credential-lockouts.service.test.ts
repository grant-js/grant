import type {
  CredentialLockoutPolicy,
  CredentialLockoutState,
  CredentialScope,
  ICredentialLockoutRepository,
} from '@grantjs/core';
import { describe, expect, it } from 'vitest';

import { CredentialLockoutService } from '@/services/credential-lockouts.service';

const POLICY: CredentialLockoutPolicy = {
  maxAttempts: 3,
  windowMs: 10 * 60_000,
  lockDurationMs: 15 * 60_000,
};
const USER = 'user-1';
const PLATFORM: CredentialScope = { scope: 'platform' };
const PROJECT_A: CredentialScope = { scope: 'project', projectId: 'project-a' };
const PROJECT_B: CredentialScope = { scope: 'project', projectId: 'project-b' };

/**
 * The same counting rules as the SQL in the real repositories, in memory. The SQL itself,
 * including its atomicity, is exercised on PostgreSQL in
 * `tests/integration/credentials.postgres.integration.test.ts`.
 */
class FakeLockoutRepository implements ICredentialLockoutRepository<CredentialScope> {
  rows = new Map<
    string,
    { failedAttempts: number; windowStartedAt: Date; lockedUntil: Date | null }
  >();

  private key(scope: CredentialScope, userId: string) {
    return `${scope.scope === 'project' ? scope.projectId : 'platform'}:${userId}`;
  }

  async recordFailure(
    scope: CredentialScope,
    userId: string,
    policy: CredentialLockoutPolicy,
    now: Date
  ): Promise<CredentialLockoutState> {
    const key = this.key(scope, userId);
    const row = this.rows.get(key);
    if (!row) {
      const created = {
        failedAttempts: 1,
        windowStartedAt: now,
        lockedUntil:
          policy.maxAttempts <= 1 ? new Date(now.getTime() + policy.lockDurationMs) : null,
      };
      this.rows.set(key, created);
      return { failedAttempts: created.failedAttempts, lockedUntil: created.lockedUntil };
    }
    const restarts =
      row.windowStartedAt.getTime() < now.getTime() - policy.windowMs ||
      (row.lockedUntil !== null && row.lockedUntil.getTime() <= now.getTime());
    const next = restarts ? 1 : row.failedAttempts + 1;
    const lockActive = row.lockedUntil !== null && row.lockedUntil.getTime() > now.getTime();
    row.windowStartedAt = restarts ? now : row.windowStartedAt;
    row.failedAttempts = next;
    row.lockedUntil = lockActive
      ? row.lockedUntil
      : next >= policy.maxAttempts
        ? new Date(now.getTime() + policy.lockDurationMs)
        : null;
    return { failedAttempts: row.failedAttempts, lockedUntil: row.lockedUntil };
  }

  async getState(scope: CredentialScope, userId: string) {
    const row = this.rows.get(this.key(scope, userId));
    return row ? { failedAttempts: row.failedAttempts, lockedUntil: row.lockedUntil } : null;
  }

  async reset(scope: CredentialScope, userId: string) {
    this.rows.delete(this.key(scope, userId));
  }

  async resetAllForUser(userId: string) {
    for (const key of [...this.rows.keys()]) {
      if (key.endsWith(`:${userId}`)) this.rows.delete(key);
    }
  }
}

function build(startAt = new Date('2026-10-16T10:00:00.000Z')) {
  const clock = { now: startAt };
  const platform = new FakeLockoutRepository();
  const project = new FakeLockoutRepository();
  const passthrough = {
    transaction: (caller: never, work: (tx: never) => Promise<unknown>) => work(caller),
  };
  const service = new CredentialLockoutService(
    { platform, project },
    POLICY,
    passthrough as never,
    () => clock.now
  );
  const advance = (ms: number) => {
    clock.now = new Date(clock.now.getTime() + ms);
  };
  return { service, advance };
}

describe('CredentialLockoutService', () => {
  it('reports an untouched user as unlocked with no failures', async () => {
    const { service } = build();
    expect(await service.getStatus(PROJECT_A, USER)).toEqual({
      failedAttempts: 0,
      lockedUntil: null,
      locked: false,
    });
  });

  it('counts failures and locks at the limit', async () => {
    const { service } = build();
    expect((await service.recordFailure(PROJECT_A, USER)).locked).toBe(false);
    expect((await service.recordFailure(PROJECT_A, USER)).failedAttempts).toBe(2);
    const third = await service.recordFailure(PROJECT_A, USER);
    expect(third).toMatchObject({ failedAttempts: 3, locked: true });
    expect((await service.getStatus(PROJECT_A, USER)).locked).toBe(true);
  });

  it('does not extend an active lock with further failures', async () => {
    const { service, advance } = build();
    for (let i = 0; i < 3; i += 1) await service.recordFailure(PROJECT_A, USER);
    const locked = await service.getStatus(PROJECT_A, USER);
    advance(60_000);
    const again = await service.recordFailure(PROJECT_A, USER);
    expect(again.lockedUntil).toEqual(locked.lockedUntil);
  });

  it('unlocks when the lock has run out, and starts counting again', async () => {
    const { service, advance } = build();
    for (let i = 0; i < 3; i += 1) await service.recordFailure(PROJECT_A, USER);
    advance(POLICY.lockDurationMs + 1);
    expect((await service.getStatus(PROJECT_A, USER)).locked).toBe(false);
    expect(await service.recordFailure(PROJECT_A, USER)).toMatchObject({
      failedAttempts: 1,
      locked: false,
    });
  });

  it('forgets failures that fall outside the window', async () => {
    const { service, advance } = build();
    await service.recordFailure(PROJECT_A, USER);
    await service.recordFailure(PROJECT_A, USER);
    advance(POLICY.windowMs + 1);
    expect(await service.recordFailure(PROJECT_A, USER)).toMatchObject({
      failedAttempts: 1,
      locked: false,
    });
  });

  it('resets on demand', async () => {
    const { service } = build();
    for (let i = 0; i < 3; i += 1) await service.recordFailure(PROJECT_A, USER);
    await service.reset(PROJECT_A, USER);
    expect(await service.getStatus(PROJECT_A, USER)).toEqual({
      failedAttempts: 0,
      lockedUntil: null,
      locked: false,
    });
  });

  it('keeps one budget per (scope, user): projects, platform and other users are independent', async () => {
    const { service } = build();
    for (let i = 0; i < 3; i += 1) await service.recordFailure(PROJECT_A, USER);

    expect((await service.getStatus(PROJECT_A, USER)).locked).toBe(true);
    expect((await service.getStatus(PROJECT_B, USER)).locked).toBe(false);
    expect((await service.getStatus(PLATFORM, USER)).locked).toBe(false);
    expect((await service.getStatus(PROJECT_A, 'user-2')).locked).toBe(false);
  });

  it('counts for a user whether or not they have a credential: it only sees the user id', async () => {
    const { service } = build();
    await service.recordFailure(PLATFORM, 'user-without-credential');
    expect((await service.getStatus(PLATFORM, 'user-without-credential')).failedAttempts).toBe(1);
  });

  it('clears the state of a user in both scopes', async () => {
    const { service } = build();
    await service.recordFailure(PLATFORM, USER);
    await service.recordFailure(PROJECT_A, USER);
    await service.resetAllForUser(USER);
    expect((await service.getStatus(PLATFORM, USER)).failedAttempts).toBe(0);
    expect((await service.getStatus(PROJECT_A, USER)).failedAttempts).toBe(0);
  });
});
