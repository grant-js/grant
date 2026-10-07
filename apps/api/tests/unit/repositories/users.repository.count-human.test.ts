import { describe, expect, it, vi } from 'vitest';

import { UserRepository } from '@/repositories/users.repository';

const SYSTEM_USER_ID = '00000000-0000-0000-0000-000000000001';

describe('UserRepository.countHumanUsers', () => {
  it('returns the drizzle count excluding the system user', async () => {
    const where = vi.fn().mockResolvedValue([{ value: 2 }]);
    const from = vi.fn(() => ({ where }));
    const select = vi.fn(() => ({ from }));
    const repo = new UserRepository({ select } as never);

    await expect(repo.countHumanUsers(SYSTEM_USER_ID)).resolves.toBe(2);
    expect(select).toHaveBeenCalledOnce();
    expect(from).toHaveBeenCalledOnce();
    expect(where).toHaveBeenCalledOnce();
  });

  it('treats a missing count row as zero humans', async () => {
    const where = vi.fn().mockResolvedValue([]);
    const from = vi.fn(() => ({ where }));
    const select = vi.fn(() => ({ from }));
    const repo = new UserRepository({ select } as never);

    await expect(repo.countHumanUsers(SYSTEM_USER_ID)).resolves.toBe(0);
  });
});
