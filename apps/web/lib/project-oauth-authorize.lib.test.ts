import { describe, expect, it } from 'vitest';

import {
  buildProjectAuthorizeUrl,
  buildProjectOAuthEntryPath,
  getProjectOAuthRelayUrl,
  isProjectOAuthRelayRedirectUri,
  pickProjectOAuthTestRedirectUri,
} from './project-oauth-authorize.lib';

const RFC_CHALLENGE = 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM';

describe('buildProjectAuthorizeUrl', () => {
  it('includes response_type=code and S256 PKCE', () => {
    const url = buildProjectAuthorizeUrl({
      apiBase: '',
      clientId: 'app_1',
      redirectUri: 'https://app.example/cb',
      state: 'state-1',
      provider: 'github',
      locale: 'en',
      scope: 'openid profile',
      codeChallenge: RFC_CHALLENGE,
    });

    expect(url.startsWith('/api/auth/project/authorize?')).toBe(true);
    const query = new URLSearchParams(url.split('?')[1]);
    expect(query.get('response_type')).toBe('code');
    expect(query.get('code_challenge')).toBe(RFC_CHALLENGE);
    expect(query.get('code_challenge_method')).toBe('S256');
    expect(query.get('client_id')).toBe('app_1');
    expect(query.get('redirect_uri')).toBe('https://app.example/cb');
    expect(query.get('state')).toBe('state-1');
    expect(query.get('provider')).toBe('github');
    expect(query.get('locale')).toBe('en');
    expect(query.get('scope')).toBe('openid profile');
    expect(url).not.toContain('access_token');
  });

  it('omits empty scope', () => {
    const url = buildProjectAuthorizeUrl({
      apiBase: 'https://api.example',
      clientId: 'app_1',
      redirectUri: 'https://app.example/cb',
      state: 'state-1',
      provider: 'email',
      locale: 'de',
      codeChallenge: RFC_CHALLENGE,
    });
    const query = new URLSearchParams(url.split('?')[1]);
    expect(url.startsWith('https://api.example/api/auth/project/authorize?')).toBe(true);
    expect(query.has('scope')).toBe(false);
  });
});

describe('buildProjectOAuthEntryPath', () => {
  it('builds the hosted entry path with client params', () => {
    expect(
      buildProjectOAuthEntryPath({
        locale: 'en',
        clientId: 'app_1',
        redirectUri: 'https://app.example/en/auth/project/relay',
        state: 'state-1',
        scope: 'openid',
      })
    ).toBe(
      '/en/auth/project?client_id=app_1&redirect_uri=https%3A%2F%2Fapp.example%2Fen%2Fauth%2Fproject%2Frelay&state=state-1&scope=openid'
    );
  });
});

describe('Grant relay redirect helpers', () => {
  it('recognizes the locale-prefixed Grant callback', () => {
    expect(
      isProjectOAuthRelayRedirectUri(
        'https://app.example/en/auth/project/relay',
        'en',
        'https://app.example'
      )
    ).toBe(true);
    expect(
      isProjectOAuthRelayRedirectUri('https://tenant.example/callback', 'en', 'https://app.example')
    ).toBe(false);
  });

  it('prefers the Grant callback when it is allowlisted', () => {
    const relay = getProjectOAuthRelayUrl('de', 'https://app.example');
    expect(relay).toBe('https://app.example/de/auth/project/relay');
    expect(
      pickProjectOAuthTestRedirectUri(
        ['https://tenant.example/cb', relay],
        'de',
        'https://app.example'
      )
    ).toBe(relay);
  });
});
