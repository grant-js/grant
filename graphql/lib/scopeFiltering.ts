import { Scope, Tenant } from '@/graphql/generated/types';

import { Context } from '../types';

interface TenantScopeParams {
  scope: Scope;
  context: Context;
}

type CacheKey = `${Tenant}:${string}`;

export type EntityCache = {
  roles: Map<CacheKey, string[]>;
  users: Map<CacheKey, string[]>;
  groups: Map<CacheKey, string[]>;
  permissions: Map<CacheKey, string[]>;
  tags: Map<CacheKey, string[]>;
  projects: Map<CacheKey, string[]>;
};

function getScopeCache(context: Context): EntityCache {
  if (!context.scopeCache) {
    context.scopeCache = {
      roles: new Map(),
      users: new Map(),
      groups: new Map(),
      permissions: new Map(),
      tags: new Map(),
      projects: new Map(),
    };
  }
  return context.scopeCache;
}

function createCacheKey(scope: Scope): CacheKey {
  return `${scope.tenant}:${scope.id}`;
}

export async function getScopedRoleIds({ scope, context }: TenantScopeParams): Promise<string[]> {
  const cache = getScopeCache(context);
  const cacheKey = createCacheKey(scope);

  if (cache.roles.has(cacheKey)) {
    return cache.roles.get(cacheKey)!;
  }

  let roleIds: string[];
  switch (scope.tenant) {
    case Tenant.Organization: {
      const organizationRoles = await context.services.organizationRoles.getOrganizationRoles({
        organizationId: scope.id,
      });
      roleIds = organizationRoles.map((or) => or.roleId);
      break;
    }

    case Tenant.Project: {
      const projectRoles = await context.services.projectRoles.getProjectRoles({
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

export async function getScopedUserIds({ scope, context }: TenantScopeParams): Promise<string[]> {
  const cache = getScopeCache(context);
  const cacheKey = createCacheKey(scope);

  if (cache.users.has(cacheKey)) {
    return cache.users.get(cacheKey)!;
  }

  let userIds: string[];
  switch (scope.tenant) {
    case Tenant.Organization: {
      const organizationUsers = await context.services.organizationUsers.getOrganizationUsers({
        organizationId: scope.id,
      });
      userIds = organizationUsers.map((ou) => ou.userId);
      break;
    }

    case Tenant.Project: {
      const projectUsers = await context.services.projectUsers.getProjectUsers({
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

export async function getScopedGroupIds({ scope, context }: TenantScopeParams): Promise<string[]> {
  const cache = getScopeCache(context);
  const cacheKey = createCacheKey(scope);

  if (cache.groups.has(cacheKey)) {
    return cache.groups.get(cacheKey)!;
  }

  let groupIds: string[];
  switch (scope.tenant) {
    case Tenant.Organization: {
      const organizationGroups = await context.services.organizationGroups.getOrganizationGroups({
        organizationId: scope.id,
      });
      groupIds = organizationGroups.map((og) => og.groupId);
      break;
    }

    case Tenant.Project: {
      const projectGroups = await context.services.projectGroups.getProjectGroups({
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
  context,
}: TenantScopeParams): Promise<string[]> {
  const cache = getScopeCache(context);
  const cacheKey = createCacheKey(scope);

  if (cache.permissions.has(cacheKey)) {
    return cache.permissions.get(cacheKey)!;
  }

  let permissionIds: string[];
  switch (scope.tenant) {
    case Tenant.Organization: {
      const organizationPermissions =
        await context.services.organizationPermissions.getOrganizationPermissions({
          organizationId: scope.id,
        });
      permissionIds = organizationPermissions.map((op) => op.permissionId);
      break;
    }

    case Tenant.Project: {
      const projectPermissions = await context.services.projectPermissions.getProjectPermissions({
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

export async function getScopedTagIds({ scope, context }: TenantScopeParams): Promise<string[]> {
  const cache = getScopeCache(context);
  const cacheKey = createCacheKey(scope);

  if (cache.tags.has(cacheKey)) {
    console.log('cache hit', cacheKey);
    return cache.tags.get(cacheKey)!;
  }

  let tagIds: string[];
  switch (scope.tenant) {
    case Tenant.Organization: {
      const organizationTags = await context.services.organizationTags.getOrganizationTags({
        organizationId: scope.id,
      });
      tagIds = organizationTags.map((ot) => ot.tagId);
      break;
    }

    case Tenant.Project: {
      const projectTags = await context.services.projectTags.getProjectTags({
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

export async function getScopedProjectIds({
  scope,
  context,
}: TenantScopeParams): Promise<string[]> {
  const cache = getScopeCache(context);
  const cacheKey = createCacheKey(scope);

  if (cache.projects.has(cacheKey)) {
    return cache.projects.get(cacheKey)!;
  }

  let projectIds: string[];
  switch (scope.tenant) {
    case Tenant.Organization: {
      const organizationProjects =
        await context.services.organizationProjects.getOrganizationProjects({
          organizationId: scope.id,
        });
      projectIds = organizationProjects.map((op) => op.projectId);
      break;
    }
    default:
      throw new Error(`Unsupported tenant type: ${scope.tenant}`);
  }
  cache.projects.set(cacheKey, projectIds);
  return projectIds;
}
