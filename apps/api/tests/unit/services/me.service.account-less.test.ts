/**
 * `MeService` for a user who owns no account: `getMe` answers with an empty account list
 * (what the console reads to know the session is account-less), and the service-level
 * rule for a second account refuses on its own -- a second line behind the handler's
 * sign-up policy gate.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { BadRequestError } from '@/lib/errors';
import { MeService } from '@/services/me.service';

const USER_ID = '30000000-0000-4000-8000-000000000099';

const userRepository = { getUsers: vi.fn() };
const accountRepository = {
  getActiveAccountsByOwnerId: vi.fn(),
  createAccount: vi.fn(),
};

function service() {
  return new MeService(
    userRepository as never,
    accountRepository as never,
    { auth: { userId: USER_ID } } as never,
    { getUrl: vi.fn() } as never
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  accountRepository.getActiveAccountsByOwnerId.mockResolvedValue([]);
});

describe('MeService without an account', () => {
  it('getMe returns an empty account list and the email of the identity', async () => {
    userRepository.getUsers.mockResolvedValue({
      users: [
        {
          id: USER_ID,
          accounts: [],
          authenticationMethods: [
            {
              provider: 'email',
              providerId: 'imported@example.com',
              isVerified: true,
              createdAt: new Date(),
            },
          ],
        },
      ],
    });

    const me = await service().getMe();

    expect(me.accounts).toEqual([]);
    expect(me.email).toBe('imported@example.com');
    expect(me.requiresEmailVerification).toBe(false);
  });

  it('createMySecondaryAccount creates nothing', async () => {
    await expect(service().createMySecondaryAccount()).rejects.toBeInstanceOf(BadRequestError);

    expect(accountRepository.createAccount).not.toHaveBeenCalled();
  });
});
