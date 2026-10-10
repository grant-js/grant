import { afterEach, describe, expect, it } from 'vitest';

import { GRANT_PRIMARY_COLOR } from '@/lib/oauth-branding';

import {
  clearProjectOAuthBrandingCacheForTests,
  isProjectOAuthBrandingPath,
  projectOAuthBrandingCacheKey,
  projectOAuthBrandingCacheKeyFromSearch,
  projectOAuthBrandingFromPublicInfo,
  readProjectOAuthBrandingCache,
  readProjectOAuthBrandingForLocation,
  resolveAuthLayoutChrome,
  writeProjectOAuthBrandingCache,
} from './project-oauth-branding';

const branding = projectOAuthBrandingFromPublicInfo({
  pictureUrl: 'https://cdn.example/app.png',
  projectName: 'Acme',
  primaryColor: '#112233',
  showHelpPanel: false,
  themeMode: 'dark',
});

afterEach(() => {
  clearProjectOAuthBrandingCacheForTests();
});

describe('isProjectOAuthBrandingPath', () => {
  it('matches hosted sign-in, email, and consent with or without locale', () => {
    expect(isProjectOAuthBrandingPath('/en/auth/project')).toBe(true);
    expect(isProjectOAuthBrandingPath('/auth/project')).toBe(true);
    expect(isProjectOAuthBrandingPath('/de/auth/project/email')).toBe(true);
    expect(isProjectOAuthBrandingPath('/auth/project/consent')).toBe(true);
  });

  it('ignores relay and Grant platform auth', () => {
    expect(isProjectOAuthBrandingPath('/en/auth/project/relay')).toBe(false);
    expect(isProjectOAuthBrandingPath('/en/auth/login')).toBe(false);
    expect(isProjectOAuthBrandingPath('/dashboard')).toBe(false);
    expect(isProjectOAuthBrandingPath(null)).toBe(false);
  });
});

describe('projectOAuthBrandingCacheKey', () => {
  it('prefers client_id over consent_token', () => {
    expect(projectOAuthBrandingCacheKey({ clientId: 'app_1', consentToken: 'tok' })).toBe(
      'client:app_1'
    );
    expect(projectOAuthBrandingCacheKeyFromSearch('?consent_token=tok')).toBe('consent:tok');
  });
});

describe('resolveAuthLayoutChrome', () => {
  it('does not paint Grant defaults while project branding is unresolved', () => {
    expect(resolveAuthLayoutChrome(null, true)).toEqual({
      showHelpPanel: false,
      panelColor: null,
    });
  });

  it('uses resolved project branding, including Grant blue when color is inherited', () => {
    expect(resolveAuthLayoutChrome(branding, true)).toEqual({
      showHelpPanel: false,
      panelColor: '#112233',
    });
    expect(
      resolveAuthLayoutChrome({ ...branding, primaryColor: null, showHelpPanel: true }, true)
    ).toEqual({
      showHelpPanel: true,
      panelColor: GRANT_PRIMARY_COLOR,
    });
  });

  it('keeps Grant login defaults when this is not a project hosted page', () => {
    expect(resolveAuthLayoutChrome(null, false)).toEqual({
      showHelpPanel: true,
      panelColor: GRANT_PRIMARY_COLOR,
    });
  });
});

describe('project OAuth branding cache', () => {
  it('returns a cached theme only for the matching client key', () => {
    writeProjectOAuthBrandingCache('client:app_1', branding);
    expect(readProjectOAuthBrandingCache('client:app_1')).toEqual(branding);
    expect(readProjectOAuthBrandingCache('client:other')).toBeNull();
    expect(
      readProjectOAuthBrandingForLocation(
        'http://localhost/en/auth/project?client_id=app_1&redirect_uri=https://app.example/cb'
      )
    ).toEqual(branding);
    expect(
      readProjectOAuthBrandingForLocation('http://localhost/en/auth/project?client_id=other')
    ).toBeNull();
  });

  it('does not cache consent-token keys', () => {
    writeProjectOAuthBrandingCache('consent:secret-consent-token', branding);
    expect(readProjectOAuthBrandingCache('consent:secret-consent-token')).toBeNull();
  });
});
