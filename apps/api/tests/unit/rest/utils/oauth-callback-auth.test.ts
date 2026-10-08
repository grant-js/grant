import { AccountType, UserAuthenticationMethodProvider } from '@grantjs/schema';
import { describe, expect, it, vi } from 'vitest';

import { AuthorizationError } from '@/lib/errors';
import { PUBLIC_SIGNUP_DISABLED_REASON } from '@/lib/signup-policy.lib';
import { handleOAuthCallbackAuth } from '@/rest/utils/auth';
import type { RequestContext } from '@/types';

vi.mock('@/config', () => ({
  config: { security: { frontendUrl: 'https://app.example.com' } },
}));

const oauthNewUser = {
  provider: UserAuthenticationMethodProvider.Github,
  redirectUrl: undefined,
  user: { id: 'gh-1', email: 'ada@example.com' },
  providerId: 'gh-1',
  accessToken: 'idp-token',
  providerData: { login: 'ada' },
  existingAuthMethod: false,
  existingUserByEmail: null,
  accountType: AccountType.Personal,
};

describe('handleOAuthCallbackAuth', () => {
  it('registers a platform GitHub/Google first-time user through AuthHandler.register', async () => {
    const register = vi.fn().mockResolvedValue({
      accessToken: 'access',
      refreshToken: 'refresh',
      account: { id: 'account-1', type: AccountType.Personal },
    });
    const context = {
      handlers: { auth: { register, login: vi.fn(), linkOAuthAuthToExistingUser: vi.fn() } },
      locale: 'en',
      userAgent: null,
      ipAddress: null,
      requestLogger: { info: vi.fn() },
      requestBaseUrl: 'https://api.example.com',
    } as unknown as RequestContext;

    const result = await handleOAuthCallbackAuth(context, oauthNewUser as never);

    expect(register).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: UserAuthenticationMethodProvider.Github,
        providerId: 'gh-1',
      }),
      'en',
      null,
      null,
      expect.anything(),
      'https://api.example.com'
    );
    expect(result.accessToken).toBe('access');
  });

  it('propagates PUBLIC_SIGNUP_DISABLED from register for a new OAuth user', async () => {
    const register = vi
      .fn()
      .mockRejectedValue(
        new AuthorizationError('Public signup is disabled', PUBLIC_SIGNUP_DISABLED_REASON)
      );
    const context = {
      handlers: { auth: { register, login: vi.fn(), linkOAuthAuthToExistingUser: vi.fn() } },
      locale: 'en',
      userAgent: null,
      ipAddress: null,
      requestLogger: { info: vi.fn() },
      requestBaseUrl: 'https://api.example.com',
    } as unknown as RequestContext;

    await expect(handleOAuthCallbackAuth(context, oauthNewUser as never)).rejects.toMatchObject({
      reason: PUBLIC_SIGNUP_DISABLED_REASON,
    });
  });

  it('logs in an existing OAuth user without calling register', async () => {
    const login = vi.fn().mockResolvedValue({
      accessToken: 'access',
      refreshToken: 'refresh',
      accounts: [{ id: 'account-1' }],
      requiresMfaStepUp: false,
    });
    const register = vi.fn();
    const context = {
      handlers: { auth: { register, login, linkOAuthAuthToExistingUser: vi.fn() } },
      locale: 'en',
      userAgent: null,
      ipAddress: null,
      requestLogger: { info: vi.fn() },
      requestBaseUrl: 'https://api.example.com',
    } as unknown as RequestContext;

    await handleOAuthCallbackAuth(context, { ...oauthNewUser, existingAuthMethod: true } as never);

    expect(login).toHaveBeenCalled();
    expect(register).not.toHaveBeenCalled();
  });
});
