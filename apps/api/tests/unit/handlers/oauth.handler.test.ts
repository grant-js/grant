import type { IOAuthProviderService } from '@grantjs/core';
import { UserAuthenticationMethodProvider } from '@grantjs/schema';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockConfig } = vi.hoisted(() => ({
  mockConfig: {
    githubOAuth: { stateValidityMinutes: 10, cliCallbackTtlSeconds: 60 },
    app: {
      isDevelopment: false,
      nodeEnv: 'test',
      version: 'test',
    },
    logging: { level: 'silent' as const, prettyPrint: false },
  },
}));

vi.mock('@/config', () => ({
  config: mockConfig,
  SOCIAL_OAUTH_PROVIDERS: [
    UserAuthenticationMethodProvider.Github,
    UserAuthenticationMethodProvider.Google,
  ],
}));

import { OAuthHandler } from '@/handlers/oauth.handler';

const mockWithTransaction = vi.fn((fn: (tx: unknown) => Promise<unknown>) => fn({}));

function createProvider(
  id: UserAuthenticationMethodProvider,
  configured = true
): IOAuthProviderService {
  return {
    provider: id,
    isConfigured: vi.fn().mockResolvedValue(configured),
    getAuthorizationUrl: vi.fn().mockReturnValue(`https://idp.example/${id}`),
    getProjectAuthorizationUrl: vi.fn().mockReturnValue(`https://idp.example/${id}/project`),
    getProjectCallbackUrl: vi.fn().mockReturnValue('https://api.example/callback'),
    exchangeCodeForToken: vi.fn().mockResolvedValue('access-token'),
    exchangeCodeForTokenWithRedirect: vi.fn().mockResolvedValue('access-token'),
    getOAuthUserInfo: vi.fn().mockResolvedValue({
      id: `${id}-user-1`,
      email: 'user@example.com',
      emailVerified: true,
      name: 'User',
      avatarUrl: 'https://example.com/a.png',
      username: 'user',
    }),
    buildProviderData: vi.fn().mockReturnValue({ email: 'user@example.com' }),
  };
}

describe('OAuthHandler', () => {
  const github = createProvider(UserAuthenticationMethodProvider.Github);
  const google = createProvider(UserAuthenticationMethodProvider.Google, false);
  const oauthState = {
    storeState: vi.fn().mockResolvedValue(undefined),
    validateState: vi.fn().mockResolvedValue(true),
    getState: vi.fn().mockResolvedValue({
      state: 'csrf',
      createdAt: Date.now(),
      action: 'login',
    }),
    deleteState: vi.fn().mockResolvedValue(undefined),
  };
  const userAuthenticationMethods = {
    getUserAuthenticationMethodByProvider: vi.fn(),
    getUserAuthenticationMethodByEmail: vi.fn(),
  };
  const cache = { oauth: { set: vi.fn(), get: vi.fn(), delete: vi.fn() } };
  const db = { withTransaction: mockWithTransaction };

  function createHandler() {
    return new OAuthHandler(
      new Map([
        [UserAuthenticationMethodProvider.Github, github],
        [UserAuthenticationMethodProvider.Google, google],
      ]),
      oauthState as never,
      userAuthenticationMethods as never,
      cache as never,
      {} as never,
      db as never
    );
  }

  beforeEach(() => {
    vi.clearAllMocks();
    mockWithTransaction.mockImplementation((fn: (tx: unknown) => Promise<unknown>) => fn({}));
    (github.isConfigured as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    (google.isConfigured as ReturnType<typeof vi.fn>).mockResolvedValue(false);
    oauthState.validateState.mockResolvedValue(true);
    oauthState.getState.mockResolvedValue({
      state: 'csrf',
      createdAt: Date.now(),
      action: 'login',
    });
  });

  it('lists configured flags per social provider', async () => {
    const handler = createHandler();
    await expect(handler.listProviders()).resolves.toEqual([
      { id: UserAuthenticationMethodProvider.Github, configured: true },
      { id: UserAuthenticationMethodProvider.Google, configured: false },
    ]);
  });

  it('initiates Google auth when Google is configured', async () => {
    (google.isConfigured as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    const handler = createHandler();
    const result = await handler.initiateAuth(UserAuthenticationMethodProvider.Google, {});
    expect(result.authorizationUrl).toBe('https://idp.example/google');
    expect(oauthState.storeState).toHaveBeenCalled();
    expect(google.getAuthorizationUrl).toHaveBeenCalled();
  });

  it('refuses to initiate Google auth when Google is not configured', async () => {
    const handler = createHandler();
    await expect(handler.initiateAuth(UserAuthenticationMethodProvider.Google, {})).rejects.toThrow(
      'Google OAuth is not configured'
    );
  });

  it('logs in when a Google identity already exists', async () => {
    (google.isConfigured as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    userAuthenticationMethods.getUserAuthenticationMethodByProvider.mockResolvedValue({
      userId: 'existing-google',
    });
    const handler = createHandler();
    const result = await handler.handleCallback(
      UserAuthenticationMethodProvider.Google,
      'code',
      'csrf'
    );
    expect(result.provider).toBe(UserAuthenticationMethodProvider.Google);
    expect(result.existingAuthMethod).toBe(true);
    expect(google.exchangeCodeForToken).toHaveBeenCalledWith('code');
  });

  it('logs in when the provider identity already exists', async () => {
    userAuthenticationMethods.getUserAuthenticationMethodByProvider.mockResolvedValue({
      userId: 'existing',
    });
    const handler = createHandler();
    const result = await handler.handleCallback(
      UserAuthenticationMethodProvider.Github,
      'code',
      'csrf'
    );
    expect(result.existingAuthMethod).toBe(true);
    expect(result.existingUserByEmail).toBeNull();
  });

  it('links when a verified email method matches a verified IdP email', async () => {
    userAuthenticationMethods.getUserAuthenticationMethodByProvider.mockResolvedValue(null);
    userAuthenticationMethods.getUserAuthenticationMethodByEmail.mockResolvedValue({
      userId: 'email-user',
      provider: UserAuthenticationMethodProvider.Email,
      isVerified: true,
    });
    const handler = createHandler();
    const result = await handler.handleCallback(
      UserAuthenticationMethodProvider.Github,
      'code',
      'csrf'
    );
    expect(result.existingUserByEmail).toEqual({
      userId: 'email-user',
      email: 'user@example.com',
    });
  });

  it('refuses to link or register when the matching email method is unverified', async () => {
    userAuthenticationMethods.getUserAuthenticationMethodByProvider.mockResolvedValue(null);
    userAuthenticationMethods.getUserAuthenticationMethodByEmail.mockResolvedValue({
      userId: 'email-user',
      provider: UserAuthenticationMethodProvider.Email,
      isVerified: false,
    });
    const handler = createHandler();
    await expect(
      handler.handleCallback(UserAuthenticationMethodProvider.Github, 'code', 'csrf')
    ).rejects.toThrow('Email is not verified');
  });

  it('refuses to auto-link onto an unverified Google method with the same email', async () => {
    userAuthenticationMethods.getUserAuthenticationMethodByProvider.mockResolvedValue(null);
    userAuthenticationMethods.getUserAuthenticationMethodByEmail.mockResolvedValue({
      userId: 'squatter',
      provider: UserAuthenticationMethodProvider.Google,
      isVerified: false,
    });
    const handler = createHandler();
    await expect(
      handler.handleCallback(UserAuthenticationMethodProvider.Github, 'code', 'csrf')
    ).rejects.toThrow('Email is not verified');
  });

  it('refuses to auto-link when the IdP email is not verified', async () => {
    (github.getOAuthUserInfo as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 'github-user-1',
      email: 'user@example.com',
      emailVerified: false,
      name: 'User',
      avatarUrl: 'https://example.com/a.png',
    });
    userAuthenticationMethods.getUserAuthenticationMethodByProvider.mockResolvedValue(null);
    userAuthenticationMethods.getUserAuthenticationMethodByEmail.mockResolvedValue({
      userId: 'email-user',
      provider: UserAuthenticationMethodProvider.Email,
      isVerified: true,
    });
    const handler = createHandler();
    await expect(
      handler.handleCallback(UserAuthenticationMethodProvider.Github, 'code', 'csrf')
    ).rejects.toThrow('Email is not verified');
  });

  it('skips email auto-link during connect-from-settings', async () => {
    oauthState.getState.mockResolvedValue({
      state: 'csrf',
      createdAt: Date.now(),
      action: 'connect',
      userId: 'authenticated-user',
    });
    userAuthenticationMethods.getUserAuthenticationMethodByProvider.mockResolvedValue(null);
    const handler = createHandler();
    const result = await handler.handleCallback(
      UserAuthenticationMethodProvider.Github,
      'code',
      'csrf'
    );
    expect(userAuthenticationMethods.getUserAuthenticationMethodByEmail).not.toHaveBeenCalled();
    expect(result.existingUserByEmail).toBeNull();
    expect(result.userId).toBe('authenticated-user');
  });
});
