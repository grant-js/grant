import { describe, expect, it } from 'vitest';

import {
  buildProjectPasswordResetHref,
  PROJECT_PASSWORD_RESET_AVAILABLE,
  PROJECT_PASSWORD_RESET_PATH,
} from './project-password-reset.lib';

describe('project password reset link', () => {
  it('is hidden until the reset view (ADR 0011 slice 5) exists', () => {
    expect(PROJECT_PASSWORD_RESET_AVAILABLE).toBe(false);
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
