import { createHash } from 'crypto';

import { AuthorizationResult, Scope, Tenant } from '@grantjs/schema';

import { CacheKey, ICacheAdapter, IEntityCacheAdapter } from '@/lib/cache';
import { BadRequestError } from '@/lib/errors';
import { Services } from '@/services';

export class CacheHandler {
  constructor(
    protected cache: IEntityCacheAdapter,
    protected readonly services: Services
  ) {}

  /**
   * Extracts the projectId from a composite scope.id
   * For OrganizationProject: scope.id = "organizationId:projectId"
   * For AccountProject: scope.id = "accountId:projectId"
   * For OrganizationProjectUser: scope.id = "organizationId:projectId:userId"
   * For AccountProjectUser: scope.id = "accountId:projectId:userId"
   */
  protected extractProjectIdFromScope(scope: Scope): string {
    const validTenants = [
      Tenant.OrganizationProject,
      Tenant.AccountProject,
      Tenant.OrganizationProjectUser,
      Tenant.AccountProjectUser,
    ];

    if (!validTenants.includes(scope.tenant)) {
      throw new BadRequestError(
        `Cannot extract projectId from tenant type: ${scope.tenant}`,
        'errors:validation.invalid',
        { field: 'scope.tenant' }
      );
    }

    const parts = scope.id.split(':');
    // For 2-part format (accountId:projectId), projectId is at index 1
    // For 3-part format (accountId:projectId:userId), projectId is also at index 1
    const projectId = parts[1];

    if (!projectId) {
      throw new BadRequestError(
        'Invalid scope: id must be in format "accountId:projectId" or "accountId:projectId:userId"',
        'errors:validation.invalid',
        { field: 'scope.id' }
      );
    }

    return projectId;
  }

  protected extractProjectUserFromScope(scope: Scope): { projectId: string; userId: string } {
    const parts = scope.id.split(':');

    let projectId: string | undefined;
    let userId: string | undefined;

    switch (scope.tenant) {
      case Tenant.ProjectUser:
        projectId = parts[0];
        userId = parts[1];
        break;
      case Tenant.OrganizationProjectUser:
      case Tenant.AccountProjectUser:
        projectId = parts[1];
        userId = parts[2];
        break;
      default:
        throw new BadRequestError(
          `Cannot extract projectId and userId from tenant type: ${scope.tenant}`,
          'errors:validation.invalid',
          { field: 'scope.tenant' }
        );
    }

    if (!projectId || !userId) {
      throw new BadRequestError(
        'Invalid scope: id must contain both projectId and userId',
        'errors:validation.invalid',
        { field: 'scope.id' }
      );
    }

    return { projectId, userId };
  }

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

    const cachedProjects = await this.cache.projects.get(cacheKey);
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
        throw new BadRequestError(
          `Unsupported tenant type: ${scope.tenant}`,
          'errors:validation.invalid',
          { field: 'tenant' }
        );
    }
    await this.cache.projects.set(cacheKey, new Set(projectIds));
    return projectIds;
  }

  async getScopedRoleIds(scope: Scope): Promise<string[]> {
    const cacheKey = this.createCacheKey(scope);

    const cachedRoles = await this.cache.roles.get(cacheKey);
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

      case Tenant.OrganizationProject:
      case Tenant.AccountProject:
      case Tenant.OrganizationProjectUser:
      case Tenant.AccountProjectUser: {
        const projectId = this.extractProjectIdFromScope(scope);
        const projectRoles = await this.services.projectRoles.getProjectRoles({
          projectId,
        });
        roleIds = projectRoles.map((pr) => pr.roleId);
        break;
      }

      case Tenant.ProjectUser: {
        const { projectId, userId } = this.extractProjectUserFromScope(scope);

        // Get user roles and project roles, then find intersection
        const [userRoles, projectRoles] = await Promise.all([
          this.services.userRoles.getUserRoles({ userId }),
          this.services.projectRoles.getProjectRoles({ projectId }),
        ]);

        const userRoleIds = new Set(userRoles.map((ur) => ur.roleId));
        const projectRoleIds = projectRoles.map((pr) => pr.roleId);

        // Return roles that are both assigned to the user AND available in the project
        // Note: We filter project roles by user roles to ensure we only return roles
        // that the user actually has, and that exist in the project
        roleIds = projectRoleIds.filter((roleId) => userRoleIds.has(roleId));
        break;
      }

      default:
        throw new BadRequestError(
          `Unsupported tenant type: ${scope.tenant}`,
          'errors:validation.invalid',
          { field: 'tenant' }
        );
    }

    await this.cache.roles.set(cacheKey, new Set(roleIds));
    return roleIds;
  }

  async getScopedUserIds(scope: Scope): Promise<string[]> {
    const cacheKey = this.createCacheKey(scope);

    const cachedUsers = await this.cache.users.get(cacheKey);
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

      case Tenant.OrganizationProject:
      case Tenant.AccountProject:
      case Tenant.OrganizationProjectUser:
      case Tenant.AccountProjectUser: {
        const projectId = this.extractProjectIdFromScope(scope);
        const projectUsers = await this.services.projectUsers.getProjectUsers({
          projectId,
        });
        userIds = projectUsers.map((pu) => pu.userId);
        break;
      }

      default:
        throw new BadRequestError(
          `Unsupported tenant type: ${scope.tenant}`,
          'errors:validation.invalid',
          { field: 'tenant' }
        );
    }

    await this.cache.users.set(cacheKey, new Set(userIds));
    return userIds;
  }

  async getScopedGroupIds(scope: Scope): Promise<string[]> {
    const cacheKey = this.createCacheKey(scope);

    const cachedGroups = await this.cache.groups.get(cacheKey);
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

      case Tenant.OrganizationProject:
      case Tenant.AccountProject:
      case Tenant.OrganizationProjectUser:
      case Tenant.AccountProjectUser: {
        const projectId = this.extractProjectIdFromScope(scope);
        const projectGroups = await this.services.projectGroups.getProjectGroups({
          projectId,
        });
        groupIds = projectGroups.map((pg) => pg.groupId);
        break;
      }

      default:
        throw new BadRequestError(
          `Unsupported tenant type: ${scope.tenant}`,
          'errors:validation.invalid',
          { field: 'tenant' }
        );
    }

    await this.cache.groups.set(cacheKey, new Set(groupIds));
    return groupIds;
  }

  async getScopedPermissionIds(scope: Scope): Promise<string[]> {
    const cacheKey = this.createCacheKey(scope);

    const cachedPermissions = await this.cache.permissions.get(cacheKey);
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

      case Tenant.OrganizationProject:
      case Tenant.AccountProject:
      case Tenant.OrganizationProjectUser:
      case Tenant.AccountProjectUser: {
        const projectId = this.extractProjectIdFromScope(scope);
        const projectPermissions = await this.services.projectPermissions.getProjectPermissions({
          projectId,
        });
        permissionIds = projectPermissions.map((pp) => pp.permissionId);
        break;
      }

      default:
        throw new BadRequestError(
          `Unsupported tenant type: ${scope.tenant}`,
          'errors:validation.invalid',
          { field: 'tenant' }
        );
    }

    await this.cache.permissions.set(cacheKey, new Set(permissionIds));
    return permissionIds;
  }

  async getScopedResourceIds(scope: Scope): Promise<string[]> {
    const cacheKey = this.createCacheKey(scope);

    const cachedResources = await this.cache.resources.get(cacheKey);
    if (cachedResources) {
      return Array.from(cachedResources.values());
    }

    let resourceIds: string[];
    switch (scope.tenant) {
      case Tenant.OrganizationProject:
      case Tenant.AccountProject:
      case Tenant.OrganizationProjectUser:
      case Tenant.AccountProjectUser: {
        const projectId = this.extractProjectIdFromScope(scope);
        const projectResources = await this.services.projectResources.getProjectResources({
          projectId,
        });
        resourceIds = projectResources.map((pr) => pr.resourceId);
        break;
      }

      default:
        throw new BadRequestError(
          `Unsupported tenant type: ${scope.tenant}. Resources are only supported at the project level.`,
          'errors:validation.invalid',
          { field: 'tenant' }
        );
    }

    await this.cache.resources.set(cacheKey, new Set(resourceIds));
    return resourceIds;
  }

  async getScopedTagIds(scope: Scope): Promise<string[]> {
    const cacheKey = this.createCacheKey(scope);

    const cachedTags = await this.cache.tags.get(cacheKey);
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

      case Tenant.OrganizationProject:
      case Tenant.AccountProject:
      case Tenant.OrganizationProjectUser:
      case Tenant.AccountProjectUser: {
        const projectId = this.extractProjectIdFromScope(scope);
        const projectTags = await this.services.projectTags.getProjectTags({
          projectId,
        });
        tagIds = projectTags.map((pt) => pt.tagId);
        break;
      }

      default:
        throw new BadRequestError(
          `Unsupported tenant type: ${scope.tenant}`,
          'errors:validation.invalid',
          { field: 'tenant' }
        );
    }

    await this.cache.tags.set(cacheKey, new Set(tagIds));
    return tagIds;
  }

  async getScopedApiKeyIds(scope: Scope): Promise<string[]> {
    const cacheKey = this.createCacheKey(scope);

    const cachedApiKeys = await this.cache.apiKeys?.get(cacheKey);
    if (cachedApiKeys) {
      return Array.from(cachedApiKeys.values());
    }

    let apiKeyIds: string[];
    switch (scope.tenant) {
      case Tenant.ProjectUser:
      case Tenant.AccountProjectUser:
      case Tenant.OrganizationProjectUser: {
        const { projectId, userId } = this.extractProjectUserFromScope(scope);
        const projectUserApiKeys = await this.services.projectUserApiKeys.getProjectUserApiKeys({
          projectId,
          userId,
        });
        apiKeyIds = projectUserApiKeys.map((pivot) => pivot.apiKeyId);
        break;
      }

      default:
        throw new BadRequestError(
          `Unsupported tenant type: ${scope.tenant}`,
          'errors:validation.invalid',
          { field: 'tenant' }
        );
    }

    if (this.cache.apiKeys) {
      await this.cache.apiKeys.set(cacheKey, new Set(apiKeyIds));
    }
    return apiKeyIds;
  }

  async addTagIdToScopeCache(scope: Scope, tagId: string): Promise<void> {
    await this.addIdToCache(this.cache.tags, scope, tagId);
  }

  async removeTagIdFromScopeCache(scope: Scope, tagId: string): Promise<void> {
    await this.removeIdFromCache(this.cache.tags, scope, tagId);
  }

  async addRoleIdToScopeCache(scope: Scope, roleId: string): Promise<void> {
    await this.addIdToCache(this.cache.roles, scope, roleId);
  }

  async removeRoleIdFromScopeCache(scope: Scope, roleId: string): Promise<void> {
    await this.removeIdFromCache(this.cache.roles, scope, roleId);
  }

  async addUserIdToScopeCache(scope: Scope, userId: string): Promise<void> {
    await this.addIdToCache(this.cache.users, scope, userId);
  }

  async removeUserIdFromScopeCache(scope: Scope, userId: string): Promise<void> {
    await this.removeIdFromCache(this.cache.users, scope, userId);
  }

  async addGroupIdToScopeCache(scope: Scope, groupId: string): Promise<void> {
    await this.addIdToCache(this.cache.groups, scope, groupId);
  }

  async removeGroupIdFromScopeCache(scope: Scope, groupId: string): Promise<void> {
    await this.removeIdFromCache(this.cache.groups, scope, groupId);
  }

  async addPermissionIdToScopeCache(scope: Scope, permissionId: string): Promise<void> {
    await this.addIdToCache(this.cache.permissions, scope, permissionId);
  }

  async removePermissionIdFromScopeCache(scope: Scope, permissionId: string): Promise<void> {
    await this.removeIdFromCache(this.cache.permissions, scope, permissionId);
  }

  async addResourceIdToScopeCache(scope: Scope, resourceId: string): Promise<void> {
    await this.addIdToCache(this.cache.resources, scope, resourceId);
  }

  async removeResourceIdFromScopeCache(scope: Scope, resourceId: string): Promise<void> {
    await this.removeIdFromCache(this.cache.resources, scope, resourceId);
  }

  async addProjectIdToScopeCache(scope: Scope, projectId: string): Promise<void> {
    await this.addIdToCache(this.cache.projects, scope, projectId);
  }

  async removeProjectIdFromScopeCache(scope: Scope, projectId: string): Promise<void> {
    await this.removeIdFromCache(this.cache.projects, scope, projectId);
  }

  async addApiKeyIdToScopeCache(scope: Scope, apiKeyId: string): Promise<void> {
    await this.addIdToCache(this.cache.apiKeys, scope, apiKeyId);
  }

  async removeApiKeyIdFromScopeCache(scope: Scope, apiKeyId: string): Promise<void> {
    await this.removeIdFromCache(this.cache.apiKeys, scope, apiKeyId);
  }

  async invalidatePermissionsCacheForAllScopes(): Promise<void> {
    await this.cache.permissions.clear();
  }

  async invalidateRolesCacheForAllScopes(): Promise<void> {
    await this.cache.roles.clear();
  }

  async invalidateGroupsCacheForAllScopes(): Promise<void> {
    await this.cache.groups.clear();
  }

  protected getAuthorizationCacheKey(
    userId: string,
    scope: Scope,
    permission: { resource: string; action: string },
    context?: { resource?: Record<string, unknown> | null }
  ): string {
    const contextHash = context?.resource
      ? createHash('sha256').update(JSON.stringify(context.resource)).digest('hex').substring(0, 8)
      : 'none';

    return `auth:result:${userId}:${scope.tenant}:${scope.id}:${permission.resource}:${permission.action}:${contextHash}`;
  }

  protected async getAuthorizationResult<T = AuthorizationResult>(
    cacheKey: string
  ): Promise<T | null> {
    return this.cache.permissions.get<T>(cacheKey);
  }

  protected async setAuthorizationResult<T = AuthorizationResult>(
    cacheKey: string,
    result: T,
    ttlSeconds?: number
  ): Promise<void> {
    await this.cache.permissions.set(cacheKey, result, ttlSeconds);
  }

  async invalidateRolesCacheForScope(scope: Scope): Promise<void> {
    const cacheKey = this.createCacheKey(scope);
    await this.cache.roles.delete(cacheKey);
  }

  async invalidateUsersCacheForScope(scope: Scope): Promise<void> {
    const cacheKey = this.createCacheKey(scope);
    await this.cache.users.delete(cacheKey);
  }

  async invalidateGroupsCacheForScope(scope: Scope): Promise<void> {
    const cacheKey = this.createCacheKey(scope);
    await this.cache.groups.delete(cacheKey);
  }

  async invalidatePermissionsCacheForScope(scope: Scope): Promise<void> {
    const cacheKey = this.createCacheKey(scope);
    await this.cache.permissions.delete(cacheKey);
  }

  async invalidateResourcesCacheForScope(scope: Scope): Promise<void> {
    const cacheKey = this.createCacheKey(scope);
    await this.cache.resources.delete(cacheKey);
  }

  async invalidateTagsCacheForScope(scope: Scope): Promise<void> {
    const cacheKey = this.createCacheKey(scope);
    await this.cache.tags.delete(cacheKey);
  }

  async invalidateProjectsCacheForScope(scope: Scope): Promise<void> {
    const cacheKey = this.createCacheKey(scope);
    await this.cache.projects.delete(cacheKey);
  }

  async invalidateApiKeysCacheForScope(scope: Scope): Promise<void> {
    const cacheKey = this.createCacheKey(scope);
    if (this.cache.apiKeys) {
      await this.cache.apiKeys.delete(cacheKey);
    }
  }

  async invalidateAuthorizationCacheForUser(userId: string): Promise<void> {
    const pattern = `auth:result:${userId}:*`;
    const keys = await this.cache.permissions.keys(pattern);

    for (const key of keys) {
      await this.cache.permissions.delete(key);
    }
  }
}
