import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  clearProjectOAuthPublicInfoCacheForTests,
  completeProjectPasswordReset,
  exchangeProjectOAuthCode,
  getProjectAppPublicInfo,
  peekProjectAppPublicInfo,
  ProjectOAuthApiError,
  requestProjectPasswordReset,
  signInProjectWithPassword,
  verifyProjectPasswordMfa,
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

describe('signInProjectWithPassword', () => {
  const input = {
    clientId: 'app_1',
    redirectUri: 'https://app.example/cb',
    state: 'api-state',
    email: 'member@example.com',
    password: 'correct horse',
    locale: 'de',
  };

  it('POSTs the credentials to the project password route and returns the consent redirect', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          status: 'authenticated',
          redirectUrl: 'https://grant.example/de/auth/project/consent?consent_token=t',
        },
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(signInProjectWithPassword(input)).resolves.toEqual({
      status: 'authenticated',
      redirectUrl: 'https://grant.example/de/auth/project/consent?consent_token=t',
    });

    expect(fetchMock).toHaveBeenCalledWith('/api/auth/project/password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: 'app_1',
        redirect_uri: 'https://app.example/cb',
        state: 'api-state',
        email: 'member@example.com',
        password: 'correct horse',
        locale: 'de',
      }),
    });
  });

  it('returns a pending MFA step as such', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: { status: 'mfa_required', mfaToken: 'mfa-1' } }),
      })
    );
    await expect(signInProjectWithPassword(input)).resolves.toEqual({
      status: 'mfa_required',
      mfaToken: 'mfa-1',
    });
  });

  it.each([401, 429, 400])('throws ProjectOAuthApiError carrying status %i', async (status) => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status,
        json: async () => ({ error: 'nope', details: 'Invalid credentials' }),
      })
    );
    const error = await signInProjectWithPassword(input).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ProjectOAuthApiError);
    expect((error as ProjectOAuthApiError).status).toBe(status);
  });
});

describe('verifyProjectPasswordMfa', () => {
  it('POSTs the challenge token, the code and the method', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          status: 'authenticated',
          redirectUrl: 'https://grant.example/consent?consent_token=t',
        },
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      verifyProjectPasswordMfa({ mfaToken: 'mfa-1', code: '123456', method: 'totp' })
    ).resolves.toEqual({ redirectUrl: 'https://grant.example/consent?consent_token=t' });
    expect(fetchMock).toHaveBeenCalledWith('/api/auth/project/password/mfa', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mfa_token: 'mfa-1', code: '123456', method: 'totp' }),
    });
  });

  it('throws with the status on a refused code', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 401, json: async () => ({ error: 'x' }) })
    );
    const error = await verifyProjectPasswordMfa({
      mfaToken: 'mfa-1',
      code: '000000',
      method: 'totp',
    }).catch((e: unknown) => e);
    expect((error as ProjectOAuthApiError).status).toBe(401);
  });
});

describe('requestProjectPasswordReset', () => {
  const input = {
    clientId: 'app_1',
    redirectUri: 'https://app.example/cb',
    email: 'member@example.com',
    locale: 'de',
    state: ' api-state ',
  };

  it('POSTs the address (and the trimmed state) to the forgot route and resolves on any 200', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
    vi.stubGlobal('fetch', fetchMock);

    await expect(requestProjectPasswordReset(input)).resolves.toBeUndefined();

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/auth/project/password/forgot',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          client_id: 'app_1',
          redirect_uri: 'https://app.example/cb',
          email: 'member@example.com',
          locale: 'de',
          state: 'api-state',
        }),
      })
    );
  });

  it('omits an absent state and keeps the status on a failure', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue({ ok: false, status: 429, json: async () => ({ error: 'slow down' }) });
    vi.stubGlobal('fetch', fetchMock);

    await expect(requestProjectPasswordReset({ ...input, state: undefined })).rejects.toMatchObject(
      { name: 'ProjectOAuthApiError', status: 429 }
    );
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).not.toHaveProperty('state');
  });
});

describe('completeProjectPasswordReset', () => {
  const input = {
    clientId: 'app_1',
    redirectUri: 'https://app.example/cb',
    token: 'reset-token',
    password: 'N3w-Passw0rd!x',
  };

  it('POSTs the token and the new password to the reset route', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
    vi.stubGlobal('fetch', fetchMock);

    await expect(completeProjectPasswordReset(input)).resolves.toBeUndefined();

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/auth/project/password/reset',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          client_id: 'app_1',
          redirect_uri: 'https://app.example/cb',
          token: 'reset-token',
          password: 'N3w-Passw0rd!x',
        }),
      })
    );
  });

  it('throws a ProjectOAuthApiError carrying the status and the body code', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({ code: 'BAD_USER_INPUT', details: 'rules' }),
      })
    );

    const failure = await completeProjectPasswordReset(input).catch((e: unknown) => e);
    expect(failure).toBeInstanceOf(ProjectOAuthApiError);
    expect((failure as ProjectOAuthApiError).status).toBe(400);
    expect((failure as ProjectOAuthApiError).body.code).toBe('BAD_USER_INPUT');
  });
});
