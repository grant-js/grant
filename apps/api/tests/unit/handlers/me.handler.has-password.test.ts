import { describe, expect, it, vi } from 'vitest';

import { MeHandler } from '@/handlers/me.handler';

const userId = '30000000-0000-4000-8000-0000000000d1';

function method(provider: string) {
  return {
    id: `${provider}-method`,
    userId,
    provider,
    providerId: provider === 'email' ? 'ada@example.com' : '42',
    providerData: { hashedPassword: '$2b$10$leftover', otp: { token: 'secret' } },
    isVerified: true,
    isPrimary: provider === 'email',
    lastUsedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    hasPassword: false,
  };
}

function buildHandler(methods: ReturnType<typeof method>[], hasPlatformPassword: boolean) {
  const authMethods = {
    getUserAuthenticationMethods: vi.fn().mockResolvedValue(methods),
    hasPlatformPassword: vi.fn().mockResolvedValue(hasPlatformPassword),
  };
  const handler = new MeHandler(
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    authMethods as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    { getAuth: () => ({ userId }) } as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    { withTransaction: async <T>(fn: (tx: unknown) => Promise<T>): Promise<T> => fn({}) } as never
  );
  return { handler, authMethods };
}

describe('MeHandler.myUserAuthenticationMethods hasPassword (ADR 0011)', () => {
  it('is "a platform credential exists", on the Email method only', async () => {
    const { handler, authMethods } = buildHandler([method('email'), method('github')], true);

    const result = await handler.myUserAuthenticationMethods();

    expect(authMethods.hasPlatformPassword).toHaveBeenCalledWith(userId);
    expect(result.map((m) => [m.provider, m.hasPassword])).toEqual([
      ['email', true],
      ['github', false],
    ]);
  });

  it('is false for an Email method when there is no platform credential', async () => {
    const { handler } = buildHandler([method('email')], false);
    expect((await handler.myUserAuthenticationMethods())[0].hasPassword).toBe(false);
  });

  it('does not look the credential up for an account with no Email method', async () => {
    const { handler, authMethods } = buildHandler([method('github')], true);
    expect((await handler.myUserAuthenticationMethods())[0].hasPassword).toBe(false);
    expect(authMethods.hasPlatformPassword).not.toHaveBeenCalled();
  });

  it('never returns provider data', async () => {
    const { handler } = buildHandler([method('email')], true);
    const [result] = await handler.myUserAuthenticationMethods();
    expect(result.providerData).toEqual({});
  });
});
