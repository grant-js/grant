import { describe, expect, it } from 'vitest';

import de from '@/i18n/locales/de.json';
import en from '@/i18n/locales/en.json';
import type { ApiKeyScopeRow } from '@/lib/api-key-scope-groups';

import {
  getApiKeyScopeKind,
  isGrantCataloguePermission,
  partitionApiKeyScopeRows,
} from './api-key-scope-kind';

function row(id: string, slug: string | null, action: string): ApiKeyScopeRow {
  return {
    permission: {
      id,
      name: `${slug ?? 'other'} ${action}`,
      action,
      description: null,
      resource: slug ? { slug, name: slug } : null,
    },
    machineOnly: false,
  };
}

describe('isGrantCataloguePermission', () => {
  it('treats a Grant pair as Grant in PascalCase and kebab-case', () => {
    expect(isGrantCataloguePermission('User', 'Query')).toBe(true);
    expect(isGrantCataloguePermission('user', 'query')).toBe(true);
  });

  it('treats ProjectUser ExportCredentials as Grant, including kebab slugs', () => {
    expect(isGrantCataloguePermission('ProjectUser', 'ExportCredentials')).toBe(true);
    expect(isGrantCataloguePermission('project-user', 'export-credentials')).toBe(true);
  });

  it('treats a custom resource slug as Project', () => {
    expect(isGrantCataloguePermission('user-directory', 'Read')).toBe(false);
    expect(isGrantCataloguePermission('billing', 'query')).toBe(false);
  });

  it('treats an extra action on a Grant resource as Project', () => {
    expect(isGrantCataloguePermission('User', 'Publish')).toBe(false);
    expect(isGrantCataloguePermission('user', 'publish')).toBe(false);
  });
});

describe('partitionApiKeyScopeRows', () => {
  it('keeps a custom user-like slug out of the Grant list', () => {
    const rows = [
      row('user-query', 'User', 'Query'),
      row('custom-user', 'user-directory', 'Read'),
      row('session-query', 'UserSession', 'Query'),
      row('user-publish', 'user', 'publish'),
    ];

    const { grant, project } = partitionApiKeyScopeRows(rows);

    expect(grant.map((entry) => entry.permission.id)).toEqual(['user-query', 'session-query']);
    expect(project.map((entry) => entry.permission.id)).toEqual(['custom-user', 'user-publish']);
    expect(grant.every((entry) => getApiKeyScopeKind(entry) === 'grant')).toBe(true);
    expect(project.every((entry) => getApiKeyScopeKind(entry) === 'project')).toBe(true);
  });
});

describe('Grant vs Project card copy', () => {
  const copy = [
    en.user.apiKeys.scopes.grant.title,
    en.user.apiKeys.scopes.grant.description,
    en.user.apiKeys.scopes.project.title,
    en.user.apiKeys.scopes.project.description,
    en.user.apiKeys.detail.scopes.grantDescription,
    en.user.apiKeys.detail.scopes.projectDescription,
    en.user.apiKeys.detail.scopes.grantRoleDescription,
    en.user.apiKeys.detail.scopes.projectRoleDescription,
    de.user.apiKeys.scopes.grant.title,
    de.user.apiKeys.scopes.grant.description,
    de.user.apiKeys.scopes.project.title,
    de.user.apiKeys.scopes.project.description,
    de.user.apiKeys.detail.scopes.grantDescription,
    de.user.apiKeys.detail.scopes.projectDescription,
    de.user.apiKeys.detail.scopes.grantRoleDescription,
    de.user.apiKeys.detail.scopes.projectRoleDescription,
  ];

  it('never uses Organization wording on the scope cards', () => {
    for (const text of copy) {
      expect(text).not.toMatch(/organi[sz]ation/i);
    }
  });
});
