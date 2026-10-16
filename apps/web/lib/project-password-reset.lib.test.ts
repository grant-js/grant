import { describe, expect, it } from 'vitest';

import {
  buildProjectPasswordResetHref,
  buildProjectPasswordSignInHref,
  PROJECT_PASSWORD_RESET_AVAILABLE,
  PROJECT_PASSWORD_RESET_PATH,
  PROJECT_PASSWORD_SIGN_IN_PATH,
  readProjectPasswordResetToken,
} from './project-password-reset.lib';

describe('project password reset link', () => {
  it('is shown now that the reset views (ADR 0011 slice 5) exist', () => {
    expect(PROJECT_PASSWORD_RESET_AVAILABLE).toBe(true);
    expect(PROJECT_PASSWORD_RESET_PATH).toBe('/auth/project/forgot-password');
  });

  it('carries the sign-in params to the reset view, locale-less for the i18n Link', () => {
    const href = buildProjectPasswordResetHref({
      clientId: 'client-1',
      redirectUri: 'https://app.example/cb',
      state: ' state-1 ',
      clientState: 'client-state',
      scope: 'user:read',
    });
    const url = new URL(href, 'https://grant.example');
    expect(url.pathname).toBe(PROJECT_PASSWORD_RESET_PATH);
    expect(Object.fromEntries(url.searchParams)).toEqual({
      client_id: 'client-1',
      redirect_uri: 'https://app.example/cb',
      state: 'state-1',
      client_state: 'client-state',
      scope: 'user:read',
    });
  });

  it('omits what is absent', () => {
    const href = buildProjectPasswordResetHref({ clientId: 'c', redirectUri: 'https://a/b' });
    expect([...new URL(href, 'https://grant.example').searchParams.keys()]).toEqual([
      'client_id',
      'redirect_uri',
    ]);
  });
});

describe('project password sign-in link', () => {
  it('carries the client state, scope and PKCE challenge, and no API state when it has none', () => {
    const href = buildProjectPasswordSignInHref({
      clientId: 'client-1',
      redirectUri: 'https://app.example/cb',
      clientState: 'client-state',
      scope: 'user:read',
      codeChallenge: 'challenge',
      codeChallengeMethod: 'S256',
    });
    const url = new URL(href, 'https://grant.example');
    expect(url.pathname).toBe(PROJECT_PASSWORD_SIGN_IN_PATH);
    expect(Object.fromEntries(url.searchParams)).toEqual({
      client_id: 'client-1',
      redirect_uri: 'https://app.example/cb',
      client_state: 'client-state',
      scope: 'user:read',
      code_challenge: 'challenge',
      code_challenge_method: 'S256',
    });
  });
});

describe('readProjectPasswordResetToken', () => {
  it('reads the token from the fragment, with or without the leading #', () => {
    expect(readProjectPasswordResetToken('#token=abc123')).toBe('abc123');
    expect(readProjectPasswordResetToken('token=abc123')).toBe('abc123');
    expect(readProjectPasswordResetToken('#token=a%2Bb')).toBe('a+b');
  });

  it('is null when there is no usable token', () => {
    expect(readProjectPasswordResetToken('')).toBeNull();
    expect(readProjectPasswordResetToken('#')).toBeNull();
    expect(readProjectPasswordResetToken('#token=')).toBeNull();
    expect(readProjectPasswordResetToken('#other=1')).toBeNull();
  });
});
