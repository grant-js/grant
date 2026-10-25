import {
  accountProjectApiKeys,
  accountProjects,
  accountProjectTags,
  accountTags,
  organizationGroups,
  organizationPermissions,
  organizationProjectApiKeys,
  organizationProjects,
  organizationProjectTags,
  organizationRoles,
  organizationTags,
  organizationUsers,
  projectGroups,
  projectPermissions,
  projectResources,
  projectRoles,
  projectTags,
  projectUserApiKeys,
  projectUsers,
  userRoles,
} from '@grantjs/database';
import { Scope, Tenant } from '@grantjs/schema';
import { and, eq, ilike, inArray, isNull, SQL, sql } from 'drizzle-orm';

import { BadRequestError } from '@/lib/errors';
import {
  accountProjectFromScopeOrThrow,
  organizationProjectFromScopeOrThrow,
  projectIdFromScopeOrThrow,
  projectUserFromScopeOrThrow,
} from '@/lib/scope.lib';

/**
 * Entity kinds whose list path pages against a pivot subquery instead of a
 * materialized id array. Must stay aligned with CacheHandler's tenant maps.
 */
export type ScopedIdKind =
  'projects' | 'roles' | 'users' | 'groups' | 'permissions' | 'resources' | 'tags' | 'apiKeys';

export type AccessibleIdSource =
  { kind: 'empty' } | { kind: 'unsupported'; message: string } | { kind: 'sql'; sql: SQL };

type TenantAccess = 'empty' | 'sql';

/**
 * Per-kind tenant classification. A tenant missing from a map is rejected,
 * never silently empty — the same fail-closed rule as CacheHandler.
 */
export const SCOPED_ID_TENANTS: Record<ScopedIdKind, Partial<Record<Tenant, TenantAccess>>> = {
  projects: {
    [Tenant.Account]: 'sql',
    [Tenant.Organization]: 'sql',
    [Tenant.AccountProject]: 'sql',
    [Tenant.OrganizationProject]: 'sql',
  },
  roles: {
    [Tenant.Account]: 'empty',
    [Tenant.Organization]: 'sql',
    [Tenant.OrganizationProject]: 'sql',
    [Tenant.AccountProject]: 'sql',
    [Tenant.OrganizationProjectUser]: 'sql',
    [Tenant.AccountProjectUser]: 'sql',
    [Tenant.ProjectUser]: 'sql',
  },
  users: {
    [Tenant.Account]: 'empty',
    [Tenant.Organization]: 'sql',
    [Tenant.OrganizationProject]: 'sql',
    [Tenant.AccountProject]: 'sql',
    [Tenant.OrganizationProjectUser]: 'sql',
    [Tenant.AccountProjectUser]: 'sql',
  },
  groups: {
    [Tenant.Account]: 'empty',
    [Tenant.Organization]: 'sql',
    [Tenant.OrganizationProject]: 'sql',
    [Tenant.AccountProject]: 'sql',
    [Tenant.OrganizationProjectUser]: 'sql',
    [Tenant.AccountProjectUser]: 'sql',
  },
  permissions: {
    [Tenant.Account]: 'empty',
    [Tenant.Organization]: 'sql',
    [Tenant.OrganizationProject]: 'sql',
    [Tenant.AccountProject]: 'sql',
    [Tenant.OrganizationProjectUser]: 'sql',
    [Tenant.AccountProjectUser]: 'sql',
  },
  resources: {
    [Tenant.OrganizationProject]: 'sql',
    [Tenant.AccountProject]: 'sql',
    [Tenant.OrganizationProjectUser]: 'sql',
    [Tenant.AccountProjectUser]: 'sql',
  },
  tags: {
    [Tenant.Account]: 'sql',
    [Tenant.Organization]: 'sql',
    [Tenant.OrganizationProject]: 'sql',
    [Tenant.AccountProject]: 'sql',
    [Tenant.OrganizationProjectUser]: 'sql',
    [Tenant.AccountProjectUser]: 'sql',
  },
  apiKeys: {
    [Tenant.OrganizationProject]: 'sql',
    [Tenant.AccountProject]: 'sql',
    [Tenant.OrganizationProjectUser]: 'sql',
    [Tenant.AccountProjectUser]: 'sql',
    [Tenant.ProjectUser]: 'sql',
  },
};

export function accessibleIdSourceKind(
  kind: ScopedIdKind,
  tenant: Tenant
): 'empty' | 'unsupported' | 'sql' {
  return Object.hasOwn(SCOPED_ID_TENANTS[kind], tenant)
    ? (SCOPED_ID_TENANTS[kind][tenant] as TenantAccess)
    : 'unsupported';
}

function unsupportedMessage(kind: ScopedIdKind, tenant: Tenant): string {
  if (kind === 'resources') {
    return `Unsupported tenant type: ${tenant}. Resources are only supported at the project level.`;
  }
  return `Unsupported tenant type: ${tenant}`;
}

function selectActiveIds(idColumn: unknown, table: unknown, ...conditions: SQL[]): SQL {
  return sql`(SELECT ${idColumn} FROM ${table} WHERE ${and(...conditions)})`;
}

function activeEq(column: unknown, value: string, table: { deletedAt: unknown }): SQL {
  return and(eq(column as never, value), isNull(table.deletedAt as never)) as SQL;
}

function projectScopedSelect(
  idColumn: unknown,
  table: { projectId: unknown; deletedAt: unknown },
  scope: Scope
): SQL {
  return selectActiveIds(
    idColumn,
    table,
    activeEq(table.projectId, projectIdFromScopeOrThrow(scope), table)
  );
}

function buildSql(kind: ScopedIdKind, scope: Scope): SQL {
  switch (kind) {
    case 'users':
      if (scope.tenant === Tenant.Organization) {
        return selectActiveIds(
          organizationUsers.userId,
          organizationUsers,
          activeEq(organizationUsers.organizationId, scope.id, organizationUsers)
        );
      }
      return projectScopedSelect(projectUsers.userId, projectUsers, scope);

    case 'groups':
      if (scope.tenant === Tenant.Organization) {
        return selectActiveIds(
          organizationGroups.groupId,
          organizationGroups,
          activeEq(organizationGroups.organizationId, scope.id, organizationGroups)
        );
      }
      return projectScopedSelect(projectGroups.groupId, projectGroups, scope);

    case 'permissions':
      if (scope.tenant === Tenant.Organization) {
        return selectActiveIds(
          organizationPermissions.permissionId,
          organizationPermissions,
          activeEq(organizationPermissions.organizationId, scope.id, organizationPermissions)
        );
      }
      return projectScopedSelect(projectPermissions.permissionId, projectPermissions, scope);

    case 'roles':
      if (scope.tenant === Tenant.Organization) {
        return selectActiveIds(
          organizationRoles.roleId,
          organizationRoles,
          activeEq(organizationRoles.organizationId, scope.id, organizationRoles)
        );
      }
      if (scope.tenant === Tenant.ProjectUser) {
        const { projectId, userId } = projectUserFromScopeOrThrow(scope);
        return sql`(
          SELECT ${projectRoles.roleId}
          FROM ${projectRoles}
          INNER JOIN ${userRoles}
            ON ${userRoles.roleId} = ${projectRoles.roleId}
           AND ${eq(userRoles.userId, userId)}
           AND ${isNull(userRoles.deletedAt)}
          WHERE ${eq(projectRoles.projectId, projectId)}
            AND ${isNull(projectRoles.deletedAt)}
        )`;
      }
      return projectScopedSelect(projectRoles.roleId, projectRoles, scope);

    case 'resources':
      return projectScopedSelect(projectResources.resourceId, projectResources, scope);

    case 'tags':
      if (scope.tenant === Tenant.Account) {
        return selectActiveIds(
          accountTags.tagId,
          accountTags,
          activeEq(accountTags.accountId, scope.id, accountTags)
        );
      }
      if (scope.tenant === Tenant.Organization) {
        return selectActiveIds(
          organizationTags.tagId,
          organizationTags,
          activeEq(organizationTags.organizationId, scope.id, organizationTags)
        );
      }
      return projectScopedSelect(projectTags.tagId, projectTags, scope);

    case 'projects':
      if (scope.tenant === Tenant.Account) {
        return selectActiveIds(
          accountProjects.projectId,
          accountProjects,
          activeEq(accountProjects.accountId, scope.id, accountProjects)
        );
      }
      if (scope.tenant === Tenant.Organization) {
        return selectActiveIds(
          organizationProjects.projectId,
          organizationProjects,
          activeEq(organizationProjects.organizationId, scope.id, organizationProjects)
        );
      }
      if (scope.tenant === Tenant.AccountProject) {
        const { accountId } = accountProjectFromScopeOrThrow(scope);
        return selectActiveIds(
          accountProjects.projectId,
          accountProjects,
          activeEq(accountProjects.accountId, accountId, accountProjects)
        );
      }
      {
        const { organizationId } = organizationProjectFromScopeOrThrow(scope);
        return selectActiveIds(
          organizationProjects.projectId,
          organizationProjects,
          activeEq(organizationProjects.organizationId, organizationId, organizationProjects)
        );
      }

    case 'apiKeys':
      if (scope.tenant === Tenant.AccountProject) {
        const { accountId, projectId } = accountProjectFromScopeOrThrow(scope);
        return selectActiveIds(
          accountProjectApiKeys.apiKeyId,
          accountProjectApiKeys,
          and(
            eq(accountProjectApiKeys.accountId, accountId),
            eq(accountProjectApiKeys.projectId, projectId),
            isNull(accountProjectApiKeys.deletedAt)
          ) as SQL
        );
      }
      if (scope.tenant === Tenant.OrganizationProject) {
        const { organizationId, projectId } = organizationProjectFromScopeOrThrow(scope);
        return selectActiveIds(
          organizationProjectApiKeys.apiKeyId,
          organizationProjectApiKeys,
          and(
            eq(organizationProjectApiKeys.organizationId, organizationId),
            eq(organizationProjectApiKeys.projectId, projectId),
            isNull(organizationProjectApiKeys.deletedAt)
          ) as SQL
        );
      }
      {
        const { projectId, userId } = projectUserFromScopeOrThrow(scope);
        return selectActiveIds(
          projectUserApiKeys.apiKeyId,
          projectUserApiKeys,
          and(
            eq(projectUserApiKeys.projectId, projectId),
            eq(projectUserApiKeys.userId, userId),
            isNull(projectUserApiKeys.deletedAt)
          ) as SQL
        );
      }
  }
}

export function accessibleIdSource(kind: ScopedIdKind, scope: Scope): AccessibleIdSource {
  const mode = accessibleIdSourceKind(kind, scope.tenant);
  if (mode === 'unsupported') {
    return { kind: 'unsupported', message: unsupportedMessage(kind, scope.tenant) };
  }
  if (mode === 'empty') {
    return { kind: 'empty' };
  }
  return { kind: 'sql', sql: buildSql(kind, scope) };
}

export function requireAccessibleIdSource(kind: ScopedIdKind, scope: Scope): SQL | 'empty' {
  const source = accessibleIdSource(kind, scope);
  if (source.kind === 'unsupported') {
    throw new BadRequestError(source.message);
  }
  if (source.kind === 'empty') {
    return 'empty';
  }
  return source.sql;
}

export function anyTagExistsSql(
  entityIdColumn: unknown,
  pivot: { table: unknown; ownerColumn: unknown; tagColumn: unknown; deletedAt: unknown },
  tagIds: string[]
): SQL {
  return sql`EXISTS (
    SELECT 1 FROM ${pivot.table}
    WHERE ${pivot.ownerColumn} = ${entityIdColumn}
      AND ${inArray(pivot.tagColumn as never, tagIds)}
      AND ${isNull(pivot.deletedAt as never)}
  )`;
}

export function projectUserSearchSql(userIdColumn: unknown, scope: Scope, search: string): SQL {
  const projectId = projectIdFromScopeOrThrow(scope);
  return sql`EXISTS (
    SELECT 1 FROM ${projectUsers}
    WHERE ${projectUsers.userId} = ${userIdColumn}
      AND ${eq(projectUsers.projectId, projectId)}
      AND ${ilike(projectUsers.searchDocument, `%${search}%`)}
      AND ${isNull(projectUsers.deletedAt)}
  )`;
}

export function organizationProjectTagExistsSql(
  projectIdColumn: unknown,
  organizationId: string,
  tagIds: string[]
): SQL {
  return sql`EXISTS (
    SELECT 1 FROM ${organizationProjectTags}
    WHERE ${organizationProjectTags.projectId} = ${projectIdColumn}
      AND ${eq(organizationProjectTags.organizationId, organizationId)}
      AND ${inArray(organizationProjectTags.tagId, tagIds)}
      AND ${isNull(organizationProjectTags.deletedAt)}
  )`;
}

export function accountProjectTagExistsSql(
  projectIdColumn: unknown,
  accountId: string,
  tagIds: string[]
): SQL {
  return sql`EXISTS (
    SELECT 1 FROM ${accountProjectTags}
    WHERE ${accountProjectTags.projectId} = ${projectIdColumn}
      AND ${eq(accountProjectTags.accountId, accountId)}
      AND ${inArray(accountProjectTags.tagId, tagIds)}
      AND ${isNull(accountProjectTags.deletedAt)}
  )`;
}
