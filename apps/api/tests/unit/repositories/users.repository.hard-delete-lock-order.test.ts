import { eventLog, users } from '@grantjs/database';
import { describe, expect, it, vi } from 'vitest';

import { UserRepository } from '@/repositories/users.repository';

const USER_ID = '11111111-1111-4111-8111-111111111111';

/**
 * A hard delete must lock the user's `event_log` rows before it deletes the `users` row: the
 * event relay takes them in that order (claim outbox rows, then the notification insert's FK
 * share lock on `users`), and the opposite order deadlocked (GDPR hard-delete e2e, 40P01).
 */
function mockTransaction() {
  const calls: string[] = [];
  const forLock = vi.fn(async (mode: string) => {
    calls.push(`lock:${mode}`);
    return [{ id: 'evt-1' }];
  });
  const orderBy = vi.fn(() => ({ for: forLock }));
  const where = vi.fn(() => ({ orderBy }));
  const from = vi.fn(() => ({ where }));
  const select = vi.fn(() => ({ from }));

  const returning = vi.fn(async () => {
    calls.push('delete');
    return [{ id: USER_ID, name: 'Deleted' }];
  });
  const deleteWhere = vi.fn(() => ({ returning }));
  const del = vi.fn(() => ({ where: deleteWhere }));

  return { tx: { select, delete: del }, calls, select, from, forLock, del };
}

describe('UserRepository.hardDeleteUser lock order', () => {
  it('locks the user’s event_log rows FOR UPDATE before deleting the user', async () => {
    const { tx, calls, from, forLock, del } = mockTransaction();
    const repo = new UserRepository({} as never);

    await repo.hardDeleteUser({ id: USER_ID }, tx as never);

    expect(from).toHaveBeenCalledWith(eventLog);
    expect(forLock).toHaveBeenCalledWith('update');
    expect(del).toHaveBeenCalledWith(users);
    expect(calls).toEqual(['lock:update', 'delete']);
  });

  it('does not take the outbox lock without a transaction', async () => {
    const returning = vi.fn(async () => [{ id: USER_ID, name: 'Deleted' }]);
    const del = vi.fn(() => ({ where: vi.fn(() => ({ returning })) }));
    const select = vi.fn();
    const repo = new UserRepository({ delete: del, select } as never);

    await repo.hardDeleteUser({ id: USER_ID });

    expect(select).not.toHaveBeenCalled();
    expect(del).toHaveBeenCalledWith(users);
  });
});
