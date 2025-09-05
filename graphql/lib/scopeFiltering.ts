import { Scope, Tenant } from '@/graphql/generated/types';

import { Services } from '../services';

export interface TenantScopeParams {
  scope: Scope;
  scopeCache: EntityCache;
  services: Services;
}

export type CacheKey = `${Tenant}:${string}`;

export type EntityCache = {
  roles: Map<CacheKey, string[]>;
  users: Map<CacheKey, string[]>;
  groups: Map<CacheKey, string[]>;
  permissions: Map<CacheKey, string[]>;
  tags: Map<CacheKey, string[]>;
  projects: Map<CacheKey, string[]>;
};

export function getScopeCache(scopeCache: EntityCache): EntityCache {
  if (!scopeCache) {
    scopeCache = {
      roles: new Map(),
      users: new Map(),
      groups: new Map(),
      permissions: new Map(),
      tags: new Map(),
      projects: new Map(),
    };
  }
  return scopeCache;
}

export function createCacheKey(scope: Scope): CacheKey {
  return `${scope.tenant}:${scope.id}`;
}

export async function getScopedRoleIds({
  scope,
  scopeCache,
  services,
}: TenantScopeParams): Promise<string[]> {
  const cache = getScopeCache(scopeCache);
  const cacheKey = createCacheKey(scope);

  if (cache.roles.has(cacheKey)) {
    return cache.roles.get(cacheKey)!;
  }

  let roleIds: string[];
  switch (scope.tenant) {
    case Tenant.Organization: {
      const organizationRoles = await services.organizationRoles.getOrganizationRoles({
        organizationId: scope.id,
      });
      roleIds = organizationRoles.map((or) => or.roleId);
      break;
    }

    case Tenant.Project: {
      const projectRoles = await services.projectRoles.getProjectRoles({
        projectId: scope.id,
      });
      roleIds = projectRoles.map((pr) => pr.roleId);
      break;
    }

    default:
      throw new Error(`Unsupported tenant type: ${scope.tenant}`);
  }

  cache.roles.set(cacheKey, roleIds);
  return roleIds;
}

export async function getScopedUserIds({
  scope,
  scopeCache,
  services,
}: TenantScopeParams): Promise<string[]> {
  const cache = getScopeCache(scopeCache);
  const cacheKey = createCacheKey(scope);

  if (cache.users.has(cacheKey)) {
    return cache.users.get(cacheKey)!;
  }

  let userIds: string[];
  switch (scope.tenant) {
    case Tenant.Organization: {
      const organizationUsers = await services.organizationUsers.getOrganizationUsers({
        organizationId: scope.id,
      });
      userIds = organizationUsers.map((ou) => ou.userId);
      break;
    }

    case Tenant.Project: {
      const projectUsers = await services.projectUsers.getProjectUsers({
        projectId: scope.id,
      });
      userIds = projectUsers.map((pu) => pu.userId);
      break;
    }

    default:
      throw new Error(`Unsupported tenant type: ${scope.tenant}`);
  }

  cache.users.set(cacheKey, userIds);
  return userIds;
}

export async function getScopedGroupIds({
  scope,
  scopeCache,
  services,
}: TenantScopeParams): Promise<string[]> {
  const cache = getScopeCache(scopeCache);
  const cacheKey = createCacheKey(scope);

  if (cache.groups.has(cacheKey)) {
    return cache.groups.get(cacheKey)!;
  }

  let groupIds: string[];
  switch (scope.tenant) {
    case Tenant.Organization: {
      const organizationGroups = await services.organizationGroups.getOrganizationGroups({
        organizationId: scope.id,
      });
      groupIds = organizationGroups.map((og) => og.groupId);
      break;
    }

    case Tenant.Project: {
      const projectGroups = await services.projectGroups.getProjectGroups({
        projectId: scope.id,
      });
      groupIds = projectGroups.map((pg) => pg.groupId);
      break;
    }

    default:
      throw new Error(`Unsupported tenant type: ${scope.tenant}`);
  }

  cache.groups.set(cacheKey, groupIds);
  return groupIds;
}

export async function getScopedPermissionIds({
  scope,
  scopeCache,
  services,
}: TenantScopeParams): Promise<string[]> {
  const cache = getScopeCache(scopeCache);
  const cacheKey = createCacheKey(scope);

  if (cache.permissions.has(cacheKey)) {
    return cache.permissions.get(cacheKey)!;
  }

  let permissionIds: string[];
  switch (scope.tenant) {
    case Tenant.Organization: {
      const organizationPermissions =
        await services.organizationPermissions.getOrganizationPermissions({
          organizationId: scope.id,
        });
      permissionIds = organizationPermissions.map((op) => op.permissionId);
      break;
    }

    case Tenant.Project: {
      const projectPermissions = await services.projectPermissions.getProjectPermissions({
        projectId: scope.id,
      });
      permissionIds = projectPermissions.map((pp) => pp.permissionId);
      break;
    }

    default:
      throw new Error(`Unsupported tenant type: ${scope.tenant}`);
  }

  cache.permissions.set(cacheKey, permissionIds);
  return permissionIds;
}

export async function getScopedTagIds({
  scope,
  scopeCache,
  services,
}: TenantScopeParams): Promise<string[]> {
  const cache = getScopeCache(scopeCache);
  const cacheKey = createCacheKey(scope);

  if (cache.tags.has(cacheKey)) {
    return cache.tags.get(cacheKey)!;
  }

  let tagIds: string[];
  switch (scope.tenant) {
    case Tenant.Organization: {
      const organizationTags = await services.organizationTags.getOrganizationTags({
        organizationId: scope.id,
      });
      tagIds = organizationTags.map((ot) => ot.tagId);
      break;
    }

    case Tenant.Project: {
      const projectTags = await services.projectTags.getProjectTags({
        projectId: scope.id,
      });
      tagIds = projectTags.map((pt) => pt.tagId);
      break;
    }

    default:
      throw new Error(`Unsupported tenant type: ${scope.tenant}`);
  }

  cache.tags.set(cacheKey, tagIds);
  return tagIds;
}
