import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { getProjectOAuthProviderVisibility } from './project-oauth-entry.lib';

describe('getProjectOAuthProviderVisibility', () => {
  it('shows a provider only when configured and enabled intersect', () => {
    const visibility = getProjectOAuthProviderVisibility({
      name: 'App',
      enabledProviders: ['github', 'google', 'email'],
      configuredProviders: ['github'],
      scopes: [],
      pictureUrl: null,
      primaryColor: null,
      showHelpPanel: true,
      themeMode: null,
      projectName: null,
    });
    expect(visibility).toEqual({
      showGithub: true,
      showGoogle: false,
      showEmail: true,
      showPassword: false,
    });
  });

  it('hides social buttons when enabled but not configured', () => {
    const visibility = getProjectOAuthProviderVisibility({
      name: 'App',
      enabledProviders: ['github', 'google'],
      configuredProviders: [],
      scopes: [],
      pictureUrl: null,
      primaryColor: null,
      showHelpPanel: true,
      themeMode: null,
      projectName: null,
    });
    expect(visibility.showGithub).toBe(false);
    expect(visibility.showGoogle).toBe(false);
  });

  it('treats empty enabledProviders as all enabled', () => {
    const visibility = getProjectOAuthProviderVisibility({
      name: 'App',
      enabledProviders: [],
      configuredProviders: ['google'],
      scopes: [],
      pictureUrl: null,
      primaryColor: null,
      showHelpPanel: true,
      themeMode: null,
      projectName: null,
    });
    expect(visibility.showGoogle).toBe(true);
    expect(visibility.showGithub).toBe(false);
  });
});

describe('getProjectOAuthProviderVisibility password (opt-in)', () => {
  const app = (enabledProviders: string[] | null) => ({
    name: 'App',
    enabledProviders,
    configuredProviders: ['github', 'google'],
    scopes: [],
    pictureUrl: null,
    primaryColor: null,
    showHelpPanel: true,
    themeMode: null,
    projectName: null,
  });

  it.each([[[]], [null]])('is not shown when enabledProviders is %j', (list) => {
    const visibility = getProjectOAuthProviderVisibility(app(list));
    expect(visibility.showPassword).toBe(false);
    // everything else keeps meaning "all enabled"
    expect(visibility.showEmail).toBe(true);
    expect(visibility.showGithub).toBe(true);
    expect(visibility.showGoogle).toBe(true);
  });

  it('is not shown when the list names only other providers', () => {
    expect(getProjectOAuthProviderVisibility(app(['email', 'github'])).showPassword).toBe(false);
  });

  it('is shown when the list names it, without needing a configured connection', () => {
    const visibility = getProjectOAuthProviderVisibility({
      ...app(['password']),
      configuredProviders: [],
    });
    expect(visibility).toEqual({
      showGithub: false,
      showGoogle: false,
      showEmail: false,
      showPassword: true,
    });
  });

  it('matches case-insensitively, like the API', () => {
    expect(getProjectOAuthProviderVisibility(app(['Password'])).showPassword).toBe(true);
  });

  it('is not shown while the app info is unknown', () => {
    expect(getProjectOAuthProviderVisibility(null).showPassword).toBe(false);
    expect(getProjectOAuthProviderVisibility(undefined).showPassword).toBe(false);
  });
});

describe('project OAuth hosted relay page', () => {
  it('exchanges a query authorization code and does not read a fragment token', () => {
    const pageSource = readFileSync(
      join(process.cwd(), 'app/[locale]/auth/project/relay/page.tsx'),
      'utf8'
    );
    expect(pageSource).toMatch(/searchParams\.get\('code'\)/);
    expect(pageSource).toMatch(/exchangeProjectOAuthCode/);
    expect(pageSource).toMatch(/loadProjectOAuthPkceSession/);
    expect(pageSource).not.toMatch(/window\.location\.hash/);
    expect(pageSource).not.toMatch(/params\.get\('access_token'\)/);
  });
});

describe('project OAuth hosted entry page', () => {
  it('does not import platform /api/auth/providers discovery', () => {
    const pageSource = readFileSync(
      join(process.cwd(), 'app/[locale]/auth/project/page.tsx'),
      'utf8'
    );
    expect(pageSource).not.toMatch(/oauth-providers/);
    expect(pageSource).not.toMatch(/getSocialOAuthProviders/);
    expect(pageSource).toMatch(/getProjectAppPublicInfo/);
    expect(pageSource).toMatch(/buildProjectAuthorizeUrl/);
    expect(pageSource).toMatch(/ensureProjectOAuthPkceSession/);
    expect(pageSource).toMatch(/codeChallenge/);
    expect(pageSource).toMatch(/code_challenge/);
    expect(pageSource).not.toMatch(/useSetOAuthBranding/);
    expect(pageSource).not.toMatch(/access_token/);
  });
});
