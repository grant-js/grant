import { UserAuthenticationMethodProvider } from '@grantjs/schema';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthenticationError, ConfigurationError } from '@/lib/errors';

const { mockConfig } = vi.hoisted(() => ({
  mockConfig: {
    googleOAuth: {
      clientId: 'google-client-id',
      callbackUrl: 'http://localhost:4000/api/auth/google/callback',
      projectCallbackUrl: 'http://localhost:4000/api/auth/project/callback',
      authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
      tokenUrl: 'https://oauth2.googleapis.com/token',
      userInfoUrl: 'https://www.googleapis.com/oauth2/v3/userinfo',
      scopes: ['openid', 'email', 'profile'],
    },
    app: {
      isDevelopment: false,
      nodeEnv: 'test',
      version: 'test',
    },
    logging: { level: 'silent' as const, prettyPrint: false },
  },
}));

vi.mock('@/config', () => ({ config: mockConfig }));

import { GoogleOAuthService } from '@/services/google-oauth.service';

describe('GoogleOAuthService', () => {
  const secrets = { resolve: vi.fn() };
  let service: GoogleOAuthService;

  beforeEach(() => {
    vi.clearAllMocks();
    secrets.resolve.mockResolvedValue('google-secret');
    mockConfig.googleOAuth.clientId = 'google-client-id';
    service = new GoogleOAuthService(secrets as never);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('reports configured when client id, secret, and callback are set', async () => {
    await expect(service.isConfigured()).resolves.toBe(true);
  });

  it('reports not configured when the secret is missing', async () => {
    secrets.resolve.mockResolvedValue(undefined);
    await expect(service.isConfigured()).resolves.toBe(false);
  });

  it('builds a Google authorization URL', () => {
    const url = service.getAuthorizationUrl('csrf-state');
    expect(url).toContain('https://accounts.google.com/o/oauth2/v2/auth?');
    expect(url).toContain('client_id=google-client-id');
    expect(url).toContain('state=csrf-state');
    expect(url).toContain('scope=openid+email+profile');
    expect(service.provider).toBe(UserAuthenticationMethodProvider.Google);
  });

  it('exchanges a code for a token', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ access_token: 'ya29.token' }),
    } as Response);

    await expect(service.exchangeCodeForToken('auth-code')).resolves.toBe('ya29.token');
    expect(fetchMock).toHaveBeenCalledWith(
      'https://oauth2.googleapis.com/token',
      expect.objectContaining({ method: 'POST' })
    );
    fetchMock.mockRestore();
  });

  it('loads userinfo and maps email_verified', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        sub: 'google-sub-1',
        email: 'user@example.com',
        email_verified: true,
        name: 'Ada',
        picture: 'https://lh3.googleusercontent.com/a/photo',
      }),
    } as Response);

    const user = await service.getOAuthUserInfo('ya29.token');
    expect(user).toEqual({
      id: 'google-sub-1',
      email: 'user@example.com',
      emailVerified: true,
      name: 'Ada',
      avatarUrl: 'https://lh3.googleusercontent.com/a/photo',
    });
  });

  it('normalizes a protocol-relative Google picture URL', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        sub: 'google-sub-1',
        email: 'user@example.com',
        email_verified: true,
        picture: '//lh3.googleusercontent.com/a/photo',
      }),
    } as Response);

    const user = await service.getOAuthUserInfo('ya29.token');
    expect(user.avatarUrl).toBe('https://lh3.googleusercontent.com/a/photo');
  });

  it('builds a project authorization URL with the project callback', () => {
    const url = service.getProjectAuthorizationUrl('csrf-state');
    expect(url).toContain(
      'redirect_uri=http%3A%2F%2Flocalhost%3A4000%2Fapi%2Fauth%2Fproject%2Fcallback'
    );
    expect(url).toContain('state=csrf-state');
  });

  it('throws when client id is missing', () => {
    mockConfig.googleOAuth.clientId = '';
    expect(() => service.getAuthorizationUrl('csrf-state')).toThrow(ConfigurationError);
  });

  it('exchanges a code against a custom redirect URI', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ access_token: 'ya29.token' }),
    } as Response);

    await expect(
      service.exchangeCodeForTokenWithRedirect(
        'auth-code',
        'http://localhost:4000/api/auth/project/callback'
      )
    ).resolves.toBe('ya29.token');

    const body = String(fetchMock.mock.calls[0]?.[1]?.body);
    expect(body).toContain(
      'redirect_uri=http%3A%2F%2Flocalhost%3A4000%2Fapi%2Fauth%2Fproject%2Fcallback'
    );
  });

  it('maps a Google token error to AuthenticationError', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ error: 'invalid_grant' }),
    } as Response);

    await expect(service.exchangeCodeForToken('auth-code')).rejects.toThrow(AuthenticationError);
  });

  it('maps a userinfo failure to AuthenticationError', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({}),
    } as Response);

    await expect(service.getOAuthUserInfo('ya29.token')).rejects.toThrow(
      'Failed to fetch user information from Google'
    );
  });

  it('builds provider data with googleId', () => {
    expect(
      service.buildProviderData(
        {
          id: 'google-sub-1',
          email: 'user@example.com',
          emailVerified: true,
          name: 'Ada',
          avatarUrl: 'https://lh3.googleusercontent.com/a/photo',
        },
        'ya29.token'
      )
    ).toMatchObject({
      accessToken: 'ya29.token',
      googleId: 'google-sub-1',
      email: 'user@example.com',
    });
  });
});
