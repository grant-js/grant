import { Scope, Tenant } from '@logusgraphics/grant-schema';

import { ICacheAdapter, IEntityCacheAdapter } from '@/lib/cache/cache-adapter.interface';
import { Services } from '@/services';

export type CacheKey = `${Tenant}:${string}`;

/**
 * @deprecated Use IEntityCacheAdapter instead
 * Kept for backward compatibility during migration
 */
export type EntityCache = {
  roles: Map<CacheKey, Set<string>>;
  users: Map<CacheKey, Set<string>>;
  groups: Map<CacheKey, Set<string>>;
  permissions: Map<CacheKey, Set<string>>;
  tags: Map<CacheKey, Set<string>>;
  projects: Map<CacheKey, Set<string>>;
};

export class ScopeHandler {
  constructor(
    protected scopeCache: IEntityCacheAdapter,
    protected readonly services: Services
  ) {}

  private createCacheKey(scope: Scope): CacheKey {
    return `${scope.tenant}:${scope.id}`;
  }

  private async addIdToCache(cacheAdapter: ICacheAdapter, scope: Scope, id: string): Promise<void> {
    const cacheKey = this.createCacheKey(scope);
    const exists = await cacheAdapter.has(cacheKey);

    if (exists) {
      const idsSet = await cacheAdapter.get(cacheKey);
      if (idsSet && !idsSet.has(id)) {
        idsSet.add(id);
        await cacheAdapter.set(cacheKey, idsSet);
      }
    }
  }

  private async removeIdFromCache(
    cacheAdapter: ICacheAdapter,
    scope: Scope,
    id: string
  ): Promise<void> {
    const cacheKey = this.createCacheKey(scope);
    const exists = await cacheAdapter.has(cacheKey);

    if (exists) {
      const idsSet = await cacheAdapter.get(cacheKey);
      if (idsSet && idsSet.has(id)) {
        idsSet.delete(id);
        await cacheAdapter.set(cacheKey, idsSet);
      }
    }
  }

  async getScopedProjectIds(scope: Scope): Promise<string[]> {
    const cacheKey = this.createCacheKey(scope);

    const cachedProjects = await this.scopeCache.projects.get(cacheKey);
    if (cachedProjects) {
      return Array.from(cachedProjects.values());
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
    await this.scopeCache.projects.set(cacheKey, new Set(projectIds));
    return projectIds;
  }

  async getScopedRoleIds(scope: Scope): Promise<string[]> {
    const cacheKey = this.createCacheKey(scope);

    const cachedRoles = await this.scopeCache.roles.get(cacheKey);
    if (cachedRoles) {
      return Array.from(cachedRoles.values());
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

    await this.scopeCache.roles.set(cacheKey, new Set(roleIds));
    return roleIds;
  }

  async getScopedUserIds(scope: Scope): Promise<string[]> {
    const cacheKey = this.createCacheKey(scope);

    const cachedUsers = await this.scopeCache.users.get(cacheKey);
    if (cachedUsers) {
      return Array.from(cachedUsers.values());
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

    await this.scopeCache.users.set(cacheKey, new Set(userIds));
    return userIds;
  }

  async getScopedGroupIds(scope: Scope): Promise<string[]> {
    const cacheKey = this.createCacheKey(scope);

    const cachedGroups = await this.scopeCache.groups.get(cacheKey);
    if (cachedGroups) {
      return Array.from(cachedGroups.values());
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

    await this.scopeCache.groups.set(cacheKey, new Set(groupIds));
    return groupIds;
  }

  async getScopedPermissionIds(scope: Scope): Promise<string[]> {
    const cacheKey = this.createCacheKey(scope);

    const cachedPermissions = await this.scopeCache.permissions.get(cacheKey);
    if (cachedPermissions) {
      return Array.from(cachedPermissions.values());
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

    await this.scopeCache.permissions.set(cacheKey, new Set(permissionIds));
    return permissionIds;
  }

  async getScopedTagIds(scope: Scope): Promise<string[]> {
    const cacheKey = this.createCacheKey(scope);

    const cachedTags = await this.scopeCache.tags.get(cacheKey);
    if (cachedTags) {
      return Array.from(cachedTags.values());
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

    await this.scopeCache.tags.set(cacheKey, new Set(tagIds));
    return tagIds;
  }

  async addTagIdToScopeCache(scope: Scope, tagId: string): Promise<void> {
    await this.addIdToCache(this.scopeCache.tags, scope, tagId);
  }

  async removeTagIdFromScopeCache(scope: Scope, tagId: string): Promise<void> {
    await this.removeIdFromCache(this.scopeCache.tags, scope, tagId);
  }

  async addRoleIdToScopeCache(scope: Scope, roleId: string): Promise<void> {
    await this.addIdToCache(this.scopeCache.roles, scope, roleId);
  }

  async removeRoleIdFromScopeCache(scope: Scope, roleId: string): Promise<void> {
    await this.removeIdFromCache(this.scopeCache.roles, scope, roleId);
  }

  async addUserIdToScopeCache(scope: Scope, userId: string): Promise<void> {
    await this.addIdToCache(this.scopeCache.users, scope, userId);
  }

  async removeUserIdFromScopeCache(scope: Scope, userId: string): Promise<void> {
    await this.removeIdFromCache(this.scopeCache.users, scope, userId);
  }

  async addGroupIdToScopeCache(scope: Scope, groupId: string): Promise<void> {
    await this.addIdToCache(this.scopeCache.groups, scope, groupId);
  }

  async removeGroupIdFromScopeCache(scope: Scope, groupId: string): Promise<void> {
    await this.removeIdFromCache(this.scopeCache.groups, scope, groupId);
  }

  async addPermissionIdToScopeCache(scope: Scope, permissionId: string): Promise<void> {
    await this.addIdToCache(this.scopeCache.permissions, scope, permissionId);
  }

  async removePermissionIdFromScopeCache(scope: Scope, permissionId: string): Promise<void> {
    await this.removeIdFromCache(this.scopeCache.permissions, scope, permissionId);
  }

  async addProjectIdToScopeCache(scope: Scope, projectId: string): Promise<void> {
    await this.addIdToCache(this.scopeCache.projects, scope, projectId);
  }

  async removeProjectIdFromScopeCache(scope: Scope, projectId: string): Promise<void> {
    await this.removeIdFromCache(this.scopeCache.projects, scope, projectId);
  }
}
