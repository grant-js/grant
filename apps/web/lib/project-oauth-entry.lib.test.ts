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
    expect(pageSource).not.toMatch(/useSetOAuthBranding/);
    expect(pageSource).not.toMatch(/access_token/);
  });
});
