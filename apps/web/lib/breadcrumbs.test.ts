import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

import { describe, expect, it } from 'vitest';

import { type BreadcrumbEntityNames, buildBreadcrumbs } from './breadcrumbs';

/**
 * Every dashboard page gets a crumb for each segment of its path that has a page, named after
 * the loaded entity rather than its id. The routes are read from `app/`, so a page added
 * without a breadcrumb rule fails here instead of silently losing part of its trail.
 */

const DASHBOARD = join(__dirname, '..', 'app', '[locale]', 'dashboard');

function pages(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return pages(path);
    return name === 'page.tsx' ? [path] : [];
  });
}

/** A page that only redirects never renders a breadcrumb. */
const isRedirect = (path: string) =>
  /\b(permanentRedirect|redirect)\(/.test(readFileSync(path, 'utf8'));

const routes = pages(DASHBOARD)
  .filter((path) => !isRedirect(path))
  .map((path) => {
    const parts = relative(DASHBOARD, path).split(sep).slice(0, -1);
    const params: Record<string, string> = { locale: 'en' };
    const segments = parts.map((part) => {
      const match = /^\[(\w+)\]$/.exec(part);
      if (!match) return part;
      params[match[1]] = `id-of-${match[1]}`;
      return params[match[1]];
    });
    return {
      route: ['dashboard', ...parts].join('/'),
      pathname: `/dashboard/${segments.join('/')}`.replace(/\/$/, ''),
      params,
      segments,
    };
  });

const NAMES: BreadcrumbEntityNames = Object.fromEntries(
  [
    'organizationId',
    'accountId',
    'projectId',
    'userId',
    'roleId',
    'groupId',
    'permissionId',
    'appId',
    'resourceId',
    'jobId',
    'subscriptionId',
    'apiKeyId',
    'settingsProjectId',
  ].map((key) => [key, `Name of ${key}`])
);

const build = (pathname: string, params: Record<string, string>, names = NAMES) =>
  buildBreadcrumbs({
    pathname,
    params,
    t: (key) => `common.${key}`,
    dashboardT: (key) => `nav.${key}`,
    settingsNavT: (key) => `settingsNav.${key}`,
    names,
  });

/** `/dashboard/accounts` has no page of its own, so it has no crumb. */
const SEGMENTS_WITHOUT_PAGE = new Set(['accounts']);

describe('breadcrumbs for every dashboard page', () => {
  it('finds the dashboard pages', () => {
    expect(routes.length).toBeGreaterThan(80);
  });

  it.each(routes.map((r) => [r.route, r]))('%s has a crumb per segment, no raw id', (_route, r) => {
    const crumbs = build(r.pathname, r.params);
    const expected = r.segments.filter((segment) => !SEGMENTS_WITHOUT_PAGE.has(segment)).length;
    expect(crumbs.map((crumb) => crumb.label)).toHaveLength(1 + expected);
    for (const crumb of crumbs) {
      expect(crumb.label).not.toMatch(/^id-of-/);
    }
  });
});

describe('buildBreadcrumbs', () => {
  const org = { locale: 'en', organizationId: 'o-1', projectId: 'p-1', apiKeyId: 'k-1' };

  it('names an API key detail page after the key', () => {
    const crumbs = build('/dashboard/organizations/o-1/projects/p-1/api-keys/k-1', org, {
      ...NAMES,
      apiKeyId: 'Billing key',
    });
    expect(crumbs.map((crumb) => crumb.label)).toEqual([
      'common.navigation.dashboard',
      'common.organizations.title',
      'Name of organizationId',
      'common.projects.title',
      'Name of projectId',
      'nav.apiKeys',
      'Billing key',
    ]);
    expect(crumbs.at(-2)?.href).toBe('/dashboard/organizations/o-1/projects/p-1/api-keys');
    expect(crumbs.at(-1)?.href).toBe('/dashboard/organizations/o-1/projects/p-1/api-keys/k-1');
  });

  it('shows the id while an entity loads', () => {
    const crumbs = build('/dashboard/organizations/o-1/projects/p-1/api-keys/k-1', org, {});
    expect(crumbs.at(-1)?.label).toBe('k-1');
  });

  it('gives a personal-account project path a crumb for the account', () => {
    const crumbs = build(
      '/dashboard/accounts/a-1/projects/p-1/branding',
      { locale: 'en', accountId: 'a-1', projectId: 'p-1' },
      { accountId: 'Personal', projectId: 'Docs' }
    );
    expect(crumbs.map((crumb) => crumb.label)).toEqual([
      'common.navigation.dashboard',
      'Personal',
      'common.projects.title',
      'Docs',
      'nav.branding',
    ]);
    expect(crumbs[1].href).toBe('/dashboard/accounts/a-1');
  });

  it('labels settings pages from the settings navigation', () => {
    expect(build('/dashboard/settings/security', { locale: 'en' }).map((c) => c.label)).toEqual([
      'common.navigation.dashboard',
      'nav.settings',
      'settingsNav.security',
    ]);
  });
});
