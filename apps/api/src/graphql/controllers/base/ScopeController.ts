import { Scope, Tenant } from '@logusgraphics/grant-schema';

import { Services } from '@/graphql/services';

export type CacheKey = `${Tenant}:${string}`;

export type EntityCache = {
  roles: Map<CacheKey, string[]>;
  users: Map<CacheKey, string[]>;
  groups: Map<CacheKey, string[]>;
  permissions: Map<CacheKey, string[]>;
  tags: Map<CacheKey, string[]>;
  projects: Map<CacheKey, string[]>;
};
export class ScopeController {
  constructor(
    protected scopeCache: EntityCache,
    protected readonly services: Services
  ) {}

  private getScopeCache(): EntityCache {
    if (!this.scopeCache) {
      this.scopeCache = {
        roles: new Map(),
        users: new Map(),
        groups: new Map(),
        permissions: new Map(),
        tags: new Map(),
        projects: new Map(),
      };
    }
    return this.scopeCache;
  }

  private createCacheKey(scope: Scope): CacheKey {
    return `${scope.tenant}:${scope.id}`;
  }

  async getScopedProjectIds(scope: Scope): Promise<string[]> {
    const cache = this.getScopeCache();
    const cacheKey = this.createCacheKey(scope);

    if (cache.projects.has(cacheKey)) {
      return cache.projects.get(cacheKey)!;
    }

    let projectIds: string[];
    switch (scope.tenant) {
      case Tenant.Account: {
        const accountProjects = await this.services.accountProjects.getAccountProjects({
          accountId: scope.id,
        });
        projectIds = accountProjects.map((ap) => ap.projectId);
        break;
      }
      case Tenant.Organization: {
        const organizationProjects =
          await this.services.organizationProjects.getOrganizationProjects({
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

  async getScopedRoleIds(scope: Scope): Promise<string[]> {
    const cache = this.getScopeCache();
    const cacheKey = this.createCacheKey(scope);

    if (cache.roles.has(cacheKey)) {
      return cache.roles.get(cacheKey)!;
    }

    let roleIds: string[];
    switch (scope.tenant) {
      case Tenant.Account: {
        // Personal accounts don't have account-level roles, users, groups, permissions, or tags
        // These entities exist only at the project level for personal accounts
        roleIds = [];
        break;
      }

      case Tenant.Organization: {
        const organizationRoles = await this.services.organizationRoles.getOrganizationRoles({
          organizationId: scope.id,
        });
        roleIds = organizationRoles.map((or) => or.roleId);
        break;
      }

      case Tenant.Project: {
        const projectRoles = await this.services.projectRoles.getProjectRoles({
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

  async getScopedUserIds(scope: Scope): Promise<string[]> {
    const cache = this.getScopeCache();
    const cacheKey = this.createCacheKey(scope);

    if (cache.users.has(cacheKey)) {
      return cache.users.get(cacheKey)!;
    }

    let userIds: string[];
    switch (scope.tenant) {
      case Tenant.Account: {
        // Personal accounts don't have account-level users
        // Users exist only at the project level for personal accounts
        userIds = [];
        break;
      }

      case Tenant.Organization: {
        const organizationUsers = await this.services.organizationUsers.getOrganizationUsers({
          organizationId: scope.id,
        });
        userIds = organizationUsers.map((ou) => ou.userId);
        break;
      }

      case Tenant.Project: {
        const projectUsers = await this.services.projectUsers.getProjectUsers({
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

  async getScopedGroupIds(scope: Scope): Promise<string[]> {
    const cache = this.getScopeCache();
    const cacheKey = this.createCacheKey(scope);

    if (cache.groups.has(cacheKey)) {
      return cache.groups.get(cacheKey)!;
    }

    let groupIds: string[];
    switch (scope.tenant) {
      case Tenant.Account: {
        // Personal accounts don't have account-level groups
        // Groups exist only at the project level for personal accounts
        groupIds = [];
        break;
      }

      case Tenant.Organization: {
        const organizationGroups = await this.services.organizationGroups.getOrganizationGroups({
          organizationId: scope.id,
        });
        groupIds = organizationGroups.map((og) => og.groupId);
        break;
      }

      case Tenant.Project: {
        const projectGroups = await this.services.projectGroups.getProjectGroups({
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

  async getScopedPermissionIds(scope: Scope): Promise<string[]> {
    const cache = this.getScopeCache();
    const cacheKey = this.createCacheKey(scope);

    if (cache.permissions.has(cacheKey)) {
      return cache.permissions.get(cacheKey)!;
    }

    let permissionIds: string[];
    switch (scope.tenant) {
      case Tenant.Account: {
        // Personal accounts don't have account-level permissions
        // Permissions exist only at the project level for personal accounts
        permissionIds = [];
        break;
      }

      case Tenant.Organization: {
        const organizationPermissions =
          await this.services.organizationPermissions.getOrganizationPermissions({
            organizationId: scope.id,
          });
        permissionIds = organizationPermissions.map((op) => op.permissionId);
        break;
      }

      case Tenant.Project: {
        const projectPermissions = await this.services.projectPermissions.getProjectPermissions({
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

  async getScopedTagIds(scope: Scope): Promise<string[]> {
    const cache = this.getScopeCache();
    const cacheKey = this.createCacheKey(scope);

    if (cache.tags.has(cacheKey)) {
      return cache.tags.get(cacheKey)!;
    }

    let tagIds: string[];
    switch (scope.tenant) {
      case Tenant.Account: {
        // Personal accounts don't have account-level tags
        // Tags exist only at the project level for personal accounts
        tagIds = [];
        break;
      }

      case Tenant.Organization: {
        const organizationTags = await this.services.organizationTags.getOrganizationTags({
          organizationId: scope.id,
        });
        tagIds = organizationTags.map((ot) => ot.tagId);
        break;
      }

      case Tenant.Project: {
        const projectTags = await this.services.projectTags.getProjectTags({
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
}
