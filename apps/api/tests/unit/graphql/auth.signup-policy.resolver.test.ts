import { describe, expect, it, vi } from 'vitest';

import { authSignupPolicy } from '@/graphql/resolvers/auth/queries';

describe('authSignupPolicy resolver', () => {
  it('returns the handler signup policy', async () => {
    const getSignupPolicy = vi.fn().mockResolvedValue({
      publicSignupEnabled: false,
      bootstrapOpen: true,
    });
    const resolver = authSignupPolicy as Extract<
      typeof authSignupPolicy,
      (...args: never[]) => unknown
    >;

    await expect(
      resolver(
        {},
        {},
        {
          handlers: { auth: { getSignupPolicy } },
        } as never,
        {} as never
      )
    ).resolves.toEqual({ publicSignupEnabled: false, bootstrapOpen: true });

    expect(getSignupPolicy).toHaveBeenCalledOnce();
  });
});
