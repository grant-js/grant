import type { DbSchema } from '@grantjs/database';
import type { UserSession } from '@grantjs/schema';
import { describe, expect, it } from 'vitest';

import type { Transaction } from '@/lib/transaction-manager.lib';
import type { BaseUpdateArgs } from '@/repositories/common/EntityRepository';
import { UserSessionRepository } from '@/repositories/user-sessions.repository';

/**
 * Captures the payload passed to EntityRepository.update without touching Drizzle.
 */
class CapturingUserSessionRepository extends UserSessionRepository {
  public capturedUpdate: BaseUpdateArgs | null = null;

  protected async update(params: BaseUpdateArgs, _transaction?: Transaction): Promise<UserSession> {
    this.capturedUpdate = params;
    return { id: params.id } as UserSession;
  }
}

describe('UserSessionRepository.updateUserSession (MFA persistence)', () => {
  it('forwards mfaVerifiedAt into the Drizzle update input', async () => {
    const repo = new CapturingUserSessionRepository({} as DbSchema);
    const at = new Date('2025-01-15T12:00:00.000Z');
    await repo.updateUserSession({
      id: '550e8400-e29b-41d4-a716-446655440000',
      mfaVerifiedAt: at,
    } as never);
    expect(repo.capturedUpdate?.input.mfaVerifiedAt).toEqual(at);
  });

  it('does not set mfaVerifiedAt on the update input when omitted', async () => {
    const repo = new CapturingUserSessionRepository({} as DbSchema);
    await repo.updateUserSession({
      id: '550e8400-e29b-41d4-a716-446655440000',
      lastUsedAt: new Date(),
    } as never);
    expect(repo.capturedUpdate?.input.mfaVerifiedAt).toBeUndefined();
  });
});
