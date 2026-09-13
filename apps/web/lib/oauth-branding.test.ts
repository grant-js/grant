import { describe, expect, it } from 'vitest';

import { oauthClientDisplayName, previewOAuthScopes } from './oauth-branding';

describe('oauthClientDisplayName', () => {
  it('prefers the app name', () => {
    expect(oauthClientDisplayName('Docs', 'Acme')).toBe('Docs');
  });

  it('falls back to the project when the app is unnamed', () => {
    expect(oauthClientDisplayName(null, 'Acme')).toBe('Acme');
    expect(oauthClientDisplayName('  ', 'Acme')).toBe('Acme');
  });

  it('uses the fallback when neither name is set', () => {
    expect(oauthClientDisplayName(null, null, 'this app')).toBe('this app');
  });
});

describe('previewOAuthScopes', () => {
  const scopes = [1, 2, 3, 4, 5, 6, 7];

  it('keeps the full list when it fits the preview', () => {
    expect(previewOAuthScopes([1, 2, 3], false)).toEqual([1, 2, 3]);
  });

  it('slices to the preview limit until expanded', () => {
    expect(previewOAuthScopes(scopes, false)).toEqual([1, 2, 3, 4, 5]);
    expect(previewOAuthScopes(scopes, true)).toEqual(scopes);
  });
});
