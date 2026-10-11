import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  clearProjectOAuthPublicInfoCacheForTests,
  exchangeProjectOAuthCode,
  getProjectAppPublicInfo,
  peekProjectAppPublicInfo,
} from './project-oauth-api';

afterEach(() => {
  clearProjectOAuthPublicInfoCacheForTests();
  vi.unstubAllGlobals();
});

describe('getProjectAppPublicInfo', () => {
  it('shares one in-flight request and can be peeked after resolve', async () => {
    const info = {
      name: 'Docs',
      projectName: 'Acme',
      pictureUrl: null,
      primaryColor: '#112233',
      showHelpPanel: false,
      themeMode: null,
      enabledProviders: ['email'],
      configuredProviders: [],
      scopes: [],
    };
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: info }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const [first, second] = await Promise.all([
      getProjectAppPublicInfo('app_1', 'openid', 'https://app.example/cb'),
      getProjectAppPublicInfo('app_1', 'openid', 'https://app.example/cb'),
    ]);

    expect(first).toEqual(info);
    expect(second).toEqual(info);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(peekProjectAppPublicInfo('app_1', 'openid', 'https://app.example/cb')).toEqual(info);
  });
});

describe('exchangeProjectOAuthCode', () => {
  it('POSTs authorization_code with the PKCE verifier', async () => {
    const tokens = {
      accessToken: 'access',
      refreshToken: 'refresh',
      tokenType: 'Bearer',
      expiresIn: 3600,
      scope: 'openid',
    };
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: tokens }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      exchangeProjectOAuthCode({
        clientId: 'app_1',
        redirectUri: 'https://app.example/en/auth/project/relay',
        code: 'auth-code',
        codeVerifier: 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk',
      })
    ).resolves.toEqual(tokens);

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/auth/project/token',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          grant_type: 'authorization_code',
          client_id: 'app_1',
          redirect_uri: 'https://app.example/en/auth/project/relay',
          code: 'auth-code',
          code_verifier: 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk',
        }),
      })
    );
  });
});
