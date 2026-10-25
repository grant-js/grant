import { Tenant } from '@grantjs/schema';
import { describe, expect, it } from 'vitest';

import { BadRequestError } from '@/lib/errors';
import {
  accessibleIdSource,
  accessibleIdSourceKind,
  requireAccessibleIdSource,
  type ScopedIdKind,
} from '@/repositories/common/scoped-id-source';

/**
 * Must match `cache-handler.scoped-ids.test.ts` tenant dispatch.
 * `undefined` there is `unsupported` here; `[]` there is `empty` here.
 */
const KIND_BY_METHOD: Record<string, ScopedIdKind> = {
  getScopedProjectIds: 'projects',
  getScopedRoleIds: 'roles',
  getScopedUserIds: 'users',
  getScopedGroupIds: 'groups',
  getScopedPermissionIds: 'permissions',
  getScopedResourceIds: 'resources',
  getScopedTagIds: 'tags',
  getScopedApiKeyIds: 'apiKeys',
};

const matrix: Record<ScopedIdKind, Partial<Record<Tenant, 'empty' | 'sql' | 'unsupported'>>> = {
  projects: {
    [Tenant.Account]: 'sql',
    [Tenant.Organization]: 'sql',
    [Tenant.OrganizationProject]: 'sql',
    [Tenant.AccountProject]: 'sql',
    [Tenant.OrganizationProjectUser]: 'unsupported',
    [Tenant.AccountProjectUser]: 'unsupported',
    [Tenant.ProjectUser]: 'unsupported',
    [Tenant.System]: 'unsupported',
  },
  roles: {
    [Tenant.Account]: 'empty',
    [Tenant.Organization]: 'sql',
    [Tenant.OrganizationProject]: 'sql',
    [Tenant.AccountProject]: 'sql',
    [Tenant.OrganizationProjectUser]: 'sql',
    [Tenant.AccountProjectUser]: 'sql',
    [Tenant.ProjectUser]: 'sql',
    [Tenant.System]: 'unsupported',
  },
  users: {
    [Tenant.Account]: 'empty',
    [Tenant.Organization]: 'sql',
    [Tenant.OrganizationProject]: 'sql',
    [Tenant.AccountProject]: 'sql',
    [Tenant.OrganizationProjectUser]: 'sql',
    [Tenant.AccountProjectUser]: 'sql',
    [Tenant.ProjectUser]: 'unsupported',
    [Tenant.System]: 'unsupported',
  },
  groups: {
    [Tenant.Account]: 'empty',
    [Tenant.Organization]: 'sql',
    [Tenant.OrganizationProject]: 'sql',
    [Tenant.AccountProject]: 'sql',
    [Tenant.OrganizationProjectUser]: 'sql',
    [Tenant.AccountProjectUser]: 'sql',
    [Tenant.ProjectUser]: 'unsupported',
    [Tenant.System]: 'unsupported',
  },
  permissions: {
    [Tenant.Account]: 'empty',
    [Tenant.Organization]: 'sql',
    [Tenant.OrganizationProject]: 'sql',
    [Tenant.AccountProject]: 'sql',
    [Tenant.OrganizationProjectUser]: 'sql',
    [Tenant.AccountProjectUser]: 'sql',
    [Tenant.ProjectUser]: 'unsupported',
    [Tenant.System]: 'unsupported',
  },
  resources: {
    [Tenant.Account]: 'unsupported',
    [Tenant.Organization]: 'unsupported',
    [Tenant.OrganizationProject]: 'sql',
    [Tenant.AccountProject]: 'sql',
    [Tenant.OrganizationProjectUser]: 'sql',
    [Tenant.AccountProjectUser]: 'sql',
    [Tenant.ProjectUser]: 'unsupported',
    [Tenant.System]: 'unsupported',
  },
  tags: {
    [Tenant.Account]: 'sql',
    [Tenant.Organization]: 'sql',
    [Tenant.OrganizationProject]: 'sql',
    [Tenant.AccountProject]: 'sql',
    [Tenant.OrganizationProjectUser]: 'sql',
    [Tenant.AccountProjectUser]: 'sql',
    [Tenant.ProjectUser]: 'unsupported',
    [Tenant.System]: 'unsupported',
  },
  apiKeys: {
    [Tenant.Account]: 'unsupported',
    [Tenant.Organization]: 'unsupported',
    [Tenant.OrganizationProject]: 'sql',
    [Tenant.AccountProject]: 'sql',
    [Tenant.OrganizationProjectUser]: 'sql',
    [Tenant.AccountProjectUser]: 'sql',
    [Tenant.ProjectUser]: 'sql',
    [Tenant.System]: 'unsupported',
  },
};

describe('accessibleIdSourceKind matches CacheHandler tenant dispatch', () => {
  for (const [kind, expectations] of Object.entries(matrix) as [
    ScopedIdKind,
    (typeof matrix)[ScopedIdKind],
  ][]) {
    describe(kind, () => {
      for (const [tenant, expected] of Object.entries(expectations) as [
        Tenant,
        'empty' | 'sql' | 'unsupported',
      ][]) {
        it(`${tenant} → ${expected}`, () => {
          expect(accessibleIdSourceKind(kind, tenant)).toBe(expected);
        });
      }
    });
  }

  it('covers every CacheHandler scoped-id method', () => {
    expect(Object.values(KIND_BY_METHOD).sort()).toEqual(Object.keys(matrix).sort());
  });
});

describe('requireAccessibleIdSource', () => {
  it('returns empty for account-level users', () => {
    expect(requireAccessibleIdSource('users', { tenant: Tenant.Account, id: 'acc-1' })).toBe(
      'empty'
    );
  });

  it('rejects an unsupported tenant fail-closed', () => {
    expect(() => requireAccessibleIdSource('users', { tenant: Tenant.System, id: 'sys' })).toThrow(
      BadRequestError
    );
    expect(() =>
      requireAccessibleIdSource('resources', { tenant: Tenant.Organization, id: 'org-1' })
    ).toThrow(/Resources are only supported at the project level/);
  });

  it('builds a subquery rather than an id array for organization users', () => {
    const source = accessibleIdSource('users', { tenant: Tenant.Organization, id: 'org-1' });
    expect(source.kind).toBe('sql');
    if (source.kind !== 'sql') {
      return;
    }
    expect(Array.isArray(source.sql)).toBe(false);
    expect(source.sql).toEqual(expect.objectContaining({ queryChunks: expect.any(Array) }));
  });
});
