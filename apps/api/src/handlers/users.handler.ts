import type {
  IFileStorageServicePort,
  IOrganizationUserService,
  IProjectGroupService,
  IProjectPermissionService,
  IProjectUserGroupService,
  IProjectUserPermissionService,
  IProjectUserService,
  ITransactionalConnection,
  IUserAuthenticationMethodService,
  IUserGroupService,
  IUserPermissionService,
  IUserRoleService,
  IUserService,
  IUserTagService,
} from '@grantjs/core';
import {
  AssignUserPermissionInput,
  MutationCreateUserArgs,
  MutationDeleteUserArgs,
  MutationUpdateUserArgs,
  QueryUsersArgs,
  RevokeUserPermissionInput,
  Role,
  Scope,
  Tag,
  Tenant,
  UpdateUserInput,
  UploadUserPictureInput,
  User,
  UserGroup,
  UserPage,
  UserPermission,
} from '@grantjs/schema';

import { type UserListHydrationContext, userListHydrators } from '@/hydrators/users.hydrators';
import { IEntityCacheAdapter } from '@/lib/cache';
import {
  isParentProjectScopeForPivotWrites,
  isProjectScopedUserMetadataTenant,
  isUnsupportedProjectUserMutationLeafTenant,
  mergeEffectiveUserMetadataForProject,
  mergeEffectiveUserProfileForProject,
  toMetadataRecord,
} from '@/lib/effective-project-user-metadata.lib';
import { AuthorizationError, BadRequestError, NotFoundError } from '@/lib/errors';
import { hydrateList, stripHydratedFields } from '@/lib/list-hydration/list-hydration.lib';
import { tryProjectIdFromScope } from '@/lib/project-id-from-scope.lib';
import { assertProjectPivotMetadataMutationAllowed } from '@/lib/project-pivot-metadata-auth.lib';
import { Transaction } from '@/lib/transaction-manager.lib';
import { DeleteParams, SelectedFields } from '@/types';

import { CacheHandler, type ScopeServices } from './base/cache-handler';

export type UpdateUserHandlerParams = MutationUpdateUserArgs & { actorUserId: string };

export type UploadUserPictureHandlerParams = UploadUserPictureInput & { actorUserId: string };

export class UserHandler extends CacheHandler {
  constructor(
    private readonly userTags: IUserTagService,
    private readonly users: IUserService,
    private readonly organizationUsers: IOrganizationUserService,
    private readonly projectUsers: IProjectUserService,
    private readonly userRoles: IUserRoleService,
    private readonly userGroups: IUserGroupService,
    private readonly userPermissions: IUserPermissionService,
    private readonly projectUserPermissions: IProjectUserPermissionService,
    private readonly projectUserGroups: IProjectUserGroupService,
    private readonly projectGroups: IProjectGroupService,
    private readonly projectPermissions: IProjectPermissionService,
    private readonly userAuthenticationMethods: IUserAuthenticationMethodService,
    private readonly fileStorage: IFileStorageServicePort,
    cache: IEntityCacheAdapter,
    scopeServices: ScopeServices,
    private readonly db: ITransactionalConnection<Transaction>
  ) {
    super(cache, scopeServices);
  }

  /**
   * Users with authentication methods manage their own global/pivot identity.
   * Admin-managed users (no auth methods) may be edited by admins with permission.
   */
  private assertSelfManagedIdentityMutationAllowed(
    actorUserId: string,
    targetUserId: string,
    targetHasAuthenticationMethods: boolean
  ): void {
    if (targetHasAuthenticationMethods && actorUserId !== targetUserId) {
      throw new AuthorizationError('Cannot modify another user identity for self-managed users');
    }
  }

  public async getUsers(params: QueryUsersArgs & SelectedFields<User>): Promise<UserPage> {
    const { scope, page, limit, sort, search, ids, tagIds, requestedFields } = params;

    let userIds = await this.getScopedUserIds(scope);

    if (tagIds && tagIds.length > 0) {
      const userTags = await this.userTags.getUserTagIntersection(userIds, tagIds);
      userIds = userTags
        .filter(({ userId, tagId }) => userIds.includes(userId) && tagIds.includes(tagId))
        .map(({ userId }) => userId);
    }

    if (ids && ids.length > 0) {
      userIds = ids.filter((userId) => userIds.includes(userId));
    }

    if (userIds.length === 0) {
      return {
        users: [],
        totalCount: 0,
        hasNextPage: false,
      };
    }

    let effectiveSearch = search;
    if (search != null && search.trim() !== '' && isProjectScopedUserMetadataTenant(scope.tenant)) {
      const projectId = this.extractProjectIdFromScope(scope);
      userIds = await this.projectUsers.filterUserIdsBySearchDocument({
        projectId,
        userIds,
        search: search.trim(),
      });
      if (userIds.length === 0) {
        return {
          users: [],
          totalCount: 0,
          hasNextPage: false,
        };
      }
      effectiveSearch = undefined;
    }

    const repositoryRequestedFields = stripHydratedFields<User>(requestedFields, userListHydrators);
    const usersResult = await this.users.getUsers({
      ids: userIds,
      page,
      limit,
      sort,
      search: effectiveSearch,
      requestedFields: repositoryRequestedFields,
    });

    const fieldList = requestedFields as Array<keyof User> | undefined;
    const wantsMetadata = !fieldList?.length || fieldList.includes('metadata' as keyof User);
    const wantsName = !fieldList?.length || fieldList.includes('name' as keyof User);
    const wantsPicture = !fieldList?.length || fieldList.includes('pictureUrl' as keyof User);

    if (
      isProjectScopedUserMetadataTenant(scope.tenant) &&
      (wantsMetadata || wantsName || wantsPicture)
    ) {
      const projectId = this.extractProjectIdFromScope(scope);
      const pivots = await this.projectUsers.getProjectUsers({ projectId });
      const pivotByUserId = new Map(pivots.map((pu) => [pu.userId, pu]));
      usersResult.users = usersResult.users.map((u) => {
        const pu = pivotByUserId.get(u.id);
        const next: User = { ...u };
        if (wantsMetadata) {
          next.metadata = mergeEffectiveUserMetadataForProject(
            toMetadataRecord(u.metadata),
            toMetadataRecord(pu?.metadata)
          );
        }
        if (wantsName || wantsPicture) {
          const merged = mergeEffectiveUserProfileForProject(
            u.name,
            u.pictureUrl,
            pu?.displayName,
            pu?.pictureUrl
          );
          if (wantsName) {
            next.name = merged.name;
          }
          if (wantsPicture) {
            next.pictureUrl = merged.pictureUrl ?? null;
          }
        }
        return next;
      });
    }

    return hydrateList({
      context: this.createUserListHydrationContext(scope),
      hydrators: userListHydrators,
      itemsKey: 'users',
      page: usersResult,
      requestedFields,
    });
  }

  private createUserListHydrationContext(scope: Scope): UserListHydrationContext {
    return {
      countPermissions: async (userIds) => {
        const projectId = tryProjectIdFromScope(scope);
        return projectId
          ? this.countUserPermissionsByScope(userIds, scope)
          : this.userPermissions.countUserPermissionsByUserIds(userIds);
      },
      countProjectUserApiKeys: async (userIds) => {
        const projectId = tryProjectIdFromScope(scope);
        return projectId
          ? await this.scopeServices.projectUserApiKeys.countProjectUserApiKeysByUserIds({
              projectId,
              userIds,
            })
          : new Map<string, number>();
      },
      countRoles: async (userIds) => {
        const projectId = tryProjectIdFromScope(scope);
        return projectId
          ? this.countUserRolesByScope(userIds, scope)
          : this.userRoles.countUserRolesByUserIds(userIds);
      },
      loadScopedTags: async (userIds) => {
        const pivots = await this.userTags.getUserTagsByUserIds(userIds);
        return this.hydrateScopedTagsForOwners({
          scope,
          ownerIds: userIds,
          pivots,
          getOwnerId: (pivot) => pivot.userId,
        });
      },
    };
  }

  private async countUserRolesByScope(
    userIds: string[],
    scope: Scope
  ): Promise<Map<string, number>> {
    const [scopedRoleIds, userRoles] = await Promise.all([
      this.getScopedRoleIds(scope),
      this.userRoles.getUserRolesByUserIds(userIds),
    ]);
    const scopedRoleIdSet = new Set(scopedRoleIds);
    const counts = new Map<string, number>(userIds.map((userId) => [userId, 0]));

    for (const userRole of userRoles) {
      if (scopedRoleIdSet.has(userRole.roleId)) {
        counts.set(userRole.userId, (counts.get(userRole.userId) ?? 0) + 1);
      }
    }

    return counts;
  }

  private async countUserPermissionsByScope(
    userIds: string[],
    scope: Scope
  ): Promise<Map<string, number>> {
    const [scopedPermissionIds, userPermissions] = await Promise.all([
      this.getScopedPermissionIds(scope),
      this.userPermissions.getUserPermissionsByUserIds(userIds),
    ]);
    const scopedPermissionIdSet = new Set(scopedPermissionIds);
    const counts = new Map<string, number>(userIds.map((userId) => [userId, 0]));

    for (const userPermission of userPermissions) {
      if (scopedPermissionIdSet.has(userPermission.permissionId)) {
        counts.set(userPermission.userId, (counts.get(userPermission.userId) ?? 0) + 1);
      }
    }

    return counts;
  }

  public async createUser(params: MutationCreateUserArgs): Promise<User> {
    return await this.db.withTransaction(async (tx: Transaction) => {
      const { input } = params;
      const {
        name,
        scope,
        tagIds,
        roleIds,
        groupIds,
        permissionIds,
        primaryTagId,
        metadata: inputMetadata,
      } = input;

      const metadataRecord =
        inputMetadata != null && typeof inputMetadata === 'object' && !Array.isArray(inputMetadata)
          ? (inputMetadata as Record<string, unknown>)
          : undefined;

      const user =
        scope.tenant === Tenant.Organization
          ? await this.users.createUser(
              {
                name,
                ...(metadataRecord !== undefined ? { metadata: metadataRecord } : {}),
              },
              tx
            )
          : await this.users.createUser({ name }, tx);
      const { id: userId } = user;

      let invalidatePivotAuth = false;
      switch (scope.tenant) {
        case Tenant.Organization: {
          const roleId = roleIds?.[0];
          if (!roleId) {
            throw new BadRequestError('Organization scope requires at least one role');
          }
          await this.organizationUsers.addOrganizationUser(
            { organizationId: scope.id, userId, roleId },
            tx
          );
          break;
        }
        case Tenant.OrganizationProject:
        case Tenant.AccountProject: {
          const projectId = this.extractProjectIdFromScope(scope);
          await this.projectUsers.addProjectUser(
            {
              projectId,
              userId,
              ...(metadataRecord !== undefined ? { metadata: metadataRecord } : {}),
            },
            tx
          );
          if (metadataRecord !== undefined) {
            invalidatePivotAuth = true;
          }
          break;
        }
      }

      // For non-organization scope, assign roles via user_roles; org role is stored on organization_users.role_id only
      if (roleIds && roleIds.length > 0 && scope.tenant !== Tenant.Organization) {
        await Promise.all(
          roleIds.map((roleId) => this.userRoles.addUserRole({ userId, roleId }, tx))
        );
      }

      if (tagIds && tagIds.length > 0) {
        await Promise.all(
          tagIds.map((tagId) =>
            this.userTags.addUserTag({ userId, tagId, isPrimary: tagId === primaryTagId }, tx)
          )
        );
      }

      if (groupIds && groupIds.length > 0 && scope.tenant !== Tenant.Organization) {
        await Promise.all(
          groupIds.map((groupId) => this.syncDirectUserGroupAdd({ userId, groupId, scope }, tx))
        );
      }

      if (permissionIds && permissionIds.length > 0 && scope.tenant !== Tenant.Organization) {
        await Promise.all(
          permissionIds.map((permissionId) =>
            this.syncDirectUserPermissionAdd({ userId, permissionId, scope }, tx)
          )
        );
        await this.invalidatePermissionsCacheForAllScopes();
      }

      await this.addUserIdToScopeCache(scope, userId);

      if (invalidatePivotAuth) {
        await this.invalidateAuthorizationResultsForUser(userId);
      }

      return user;
    });
  }

  public async updateUser(params: UpdateUserHandlerParams): Promise<User> {
    const { id: userId, input, actorUserId } = params;
    const { roleIds, groupIds, tagIds, primaryTagId, scope, metadata, name, pictureUrl } = input;

    await this.db.withTransaction(async (tx: Transaction) => {
      const authMethods = await this.userAuthenticationMethods.getUserAuthenticationMethods(
        { userId },
        tx
      );
      const targetHasAuthenticationMethods = authMethods.length > 0;

      const touchesLeafRestrictedFields =
        metadata !== undefined || name !== undefined || pictureUrl !== undefined;

      const leafUnsupported = isUnsupportedProjectUserMutationLeafTenant(scope.tenant);
      if (leafUnsupported && touchesLeafRestrictedFields) {
        throw new BadRequestError(
          'User profile and metadata updates require an OrganizationProject or AccountProject scope'
        );
      }

      const isParentProject = isParentProjectScopeForPivotWrites(scope.tenant);

      const isProjectPivotMeta =
        isParentProject &&
        metadata !== undefined &&
        metadata !== null &&
        typeof metadata === 'object' &&
        !Array.isArray(metadata);

      const updatingPivotProfile =
        isParentProject && (name !== undefined || pictureUrl !== undefined);

      const touchesProfileIdentity = name !== undefined || pictureUrl !== undefined;
      if (touchesProfileIdentity) {
        this.assertSelfManagedIdentityMutationAllowed(
          actorUserId,
          userId,
          targetHasAuthenticationMethods
        );
      }

      if (isProjectPivotMeta) {
        assertProjectPivotMetadataMutationAllowed(
          actorUserId,
          userId,
          targetHasAuthenticationMethods
        );
      }

      if (metadata !== undefined && !isProjectPivotMeta) {
        this.assertSelfManagedIdentityMutationAllowed(
          actorUserId,
          userId,
          targetHasAuthenticationMethods
        );
      }

      let currentTagIds: string[] = [];
      let currentRoleIds: string[] = [];
      let currentGroupIds: string[] = [];
      if (Array.isArray(tagIds)) {
        currentTagIds = await this.getUserTagIdsInScope(userId, scope);
      }
      if (Array.isArray(roleIds)) {
        currentRoleIds = await this.getUserRoleIdsInScope(userId, scope);
      }
      if (Array.isArray(groupIds)) {
        const currentGroups = await this.userGroups.getUserGroups({ userId }, tx);
        currentGroupIds = currentGroups.map((ug) => ug.groupId);
      }

      let shouldInvalidateAuth = false;

      if (isProjectPivotMeta) {
        const projectId = this.extractProjectIdFromScope(scope);
        await this.projectUsers.updateProjectUserMetadata(
          {
            projectId,
            userId,
            metadata: metadata as Record<string, unknown>,
          },
          tx
        );
        shouldInvalidateAuth = true;
      }

      if (updatingPivotProfile) {
        const projectId = this.extractProjectIdFromScope(scope);
        await this.projectUsers.updateProjectUserProfile(
          {
            projectId,
            userId,
            ...(name !== undefined ? { displayName: name } : {}),
            ...(pictureUrl !== undefined ? { pictureUrl } : {}),
          },
          tx
        );
        shouldInvalidateAuth = true;
      }

      const usersRowPatch: Omit<UpdateUserInput, 'scope'> = {};
      if (!isProjectPivotMeta && metadata !== undefined) {
        usersRowPatch.metadata = metadata;
      }
      if (!isParentProject) {
        if (name !== undefined) {
          usersRowPatch.name = name;
        }
        if (pictureUrl !== undefined) {
          usersRowPatch.pictureUrl = pictureUrl;
        }
      }
      if (roleIds !== undefined) {
        usersRowPatch.roleIds = roleIds;
      }
      if (groupIds !== undefined) {
        usersRowPatch.groupIds = groupIds;
      }
      if (tagIds !== undefined) {
        usersRowPatch.tagIds = tagIds;
      }

      await this.users.updateUser(userId, usersRowPatch, tx);

      if (Array.isArray(tagIds)) {
        const newTagIds = tagIds.filter((tagId) => !currentTagIds.includes(tagId));
        const removedTagIds = currentTagIds.filter((tagId) => !tagIds.includes(tagId));
        const updatedTagIds = tagIds.filter((tagId) => currentTagIds.includes(tagId));
        await Promise.all(
          newTagIds.map((tagId) =>
            this.userTags.addUserTag({ userId, tagId, isPrimary: tagId === primaryTagId }, tx)
          )
        );
        await Promise.all(
          removedTagIds.map((tagId) => this.userTags.removeUserTag({ userId, tagId }, tx))
        );
        await Promise.all(
          updatedTagIds.map((tagId) =>
            this.userTags.updateUserTag({ userId, tagId, isPrimary: tagId === primaryTagId }, tx)
          )
        );
      } else if (primaryTagId !== undefined) {
        const scopedTagIds = await this.getUserTagIdsInScope(userId, scope);
        if (primaryTagId && !scopedTagIds.includes(primaryTagId)) {
          throw new BadRequestError(
            'Primary tag must be one of the user tags assigned in the current scope'
          );
        }

        const scopeTagIdSet = new Set(scopedTagIds);
        const userTagPivots = await this.userTags.getUserTags({ userId }, tx);
        await Promise.all(
          userTagPivots
            .filter((userTag) => scopeTagIdSet.has(userTag.tagId))
            .map((userTag) =>
              this.userTags.updateUserTag(
                {
                  userId,
                  tagId: userTag.tagId,
                  isPrimary: primaryTagId ? userTag.tagId === primaryTagId : false,
                },
                tx
              )
            )
        );
      }
      if (Array.isArray(roleIds)) {
        const newRoleIds = roleIds.filter((roleId) => !currentRoleIds.includes(roleId));
        const removedRoleIds = currentRoleIds.filter((roleId) => !roleIds.includes(roleId));
        await Promise.all(
          newRoleIds.map((roleId) => this.userRoles.addUserRole({ userId, roleId }, tx))
        );
        await Promise.all(
          removedRoleIds.map((roleId) => this.userRoles.removeUserRole({ userId, roleId }, tx))
        );

        if (newRoleIds.length > 0 || removedRoleIds.length > 0) {
          await this.invalidateProjectUserRoleCache(userId);
        }
      }

      if (Array.isArray(groupIds)) {
        const newGroupIds = groupIds.filter((groupId) => !currentGroupIds.includes(groupId));
        const removedGroupIds = currentGroupIds.filter((groupId) => !groupIds.includes(groupId));
        await Promise.all(
          newGroupIds.map((groupId) => this.syncDirectUserGroupAdd({ userId, groupId, scope }, tx))
        );
        await Promise.all(
          removedGroupIds.map((groupId) =>
            this.syncDirectUserGroupRemove({ userId, groupId, scope }, tx)
          )
        );

        if (newGroupIds.length > 0 || removedGroupIds.length > 0) {
          await this.invalidatePermissionsCacheForAllScopes();
        }
      }

      if (shouldInvalidateAuth) {
        await this.invalidateAuthorizationResultsForUser(userId);
      }
    });

    const merged = await this.getUsers({
      ids: [userId],
      limit: 1,
      scope,
      page: 1,
      search: null,
    });
    const user = merged.users[0];
    if (!user) {
      throw new NotFoundError('User');
    }
    return user;
  }

  public async deleteUser(params: MutationDeleteUserArgs & DeleteParams): Promise<User> {
    return await this.db.withTransaction(async (tx: Transaction) => {
      const userId = params.id;
      const scope = params.scope;

      switch (scope.tenant) {
        case Tenant.Organization: {
          const [scopedTagIds, scopedRoleIds] = await Promise.all([
            this.getUserTagIdsInScope(userId, scope),
            this.getUserRoleIdsInScope(userId, scope),
          ]);
          await this.organizationUsers.removeOrganizationUser(
            { organizationId: scope.id, userId },
            tx
          );
          await Promise.all([
            ...scopedTagIds.map((tagId) => this.userTags.removeUserTag({ userId, tagId }, tx)),
            ...scopedRoleIds.map((roleId) => this.userRoles.removeUserRole({ userId, roleId }, tx)),
          ]);
          await this.removeUserIdFromScopeCache(scope, userId);
          const page = await this.users.getUsers({ ids: [userId], limit: 1 });
          const removedFromOrg = page.users?.[0];
          if (!removedFromOrg) {
            throw new NotFoundError('User');
          }
          return removedFromOrg;
        }
        case Tenant.OrganizationProject:
        case Tenant.AccountProject: {
          const projectId = this.extractProjectIdFromScope(scope);
          await this.projectUsers.removeProjectUser({ projectId, userId }, tx);
          await this.invalidateProjectUserRoleCache(userId);
          await this.removeUserIdFromScopeCache(scope, userId);
          const page = await this.users.getUsers({ ids: [userId], limit: 1 });
          const user = page.users?.[0];
          if (!user) {
            throw new NotFoundError('User');
          }
          return user;
        }
        default:
          throw new BadRequestError(`Unsupported tenant type: ${scope.tenant}`);
      }
    });
  }

  private async invalidateProjectUserRoleCache(userId: string): Promise<void> {
    const projectUsers = await this.projectUsers.getProjectUsers({ userId });
    const projectIds = projectUsers.map((pu) => pu.projectId);

    await Promise.all(
      projectIds.map(async (projectId) => {
        const scope: Scope = {
          tenant: Tenant.ProjectUser,
          id: `${projectId}:${userId}`,
        };
        await this.invalidateRolesCacheForScope(scope);
      })
    );
  }

  public async getUserTags(params: { userId: string } & SelectedFields<User>): Promise<Array<Tag>> {
    const { userId, requestedFields } = params;
    const usersPage = await this.users.getUsers({ ids: [userId], requestedFields });
    if (Array.isArray(usersPage.users) && usersPage.users.length > 0) {
      return usersPage.users[0].tags || [];
    }
    return [];
  }

  /**
   * Returns the raw user_tags pivot rows for a user.
   * Used by User.tags resolver, which then intersects with scoped tag IDs to
   * avoid leaking tags from other projects/scopes (User.tags is project-scoped).
   */
  public async getUserTagPivots(params: {
    userId: string;
  }): Promise<Array<{ tagId: string; isPrimary: boolean }>> {
    const pivots = await this.userTags.getUserTags({ userId: params.userId });
    return pivots.map((p) => ({ tagId: p.tagId, isPrimary: p.isPrimary }));
  }

  public async countUserRoles(params: { userId: string }): Promise<number> {
    return this.userRoles.countUserRoles(params);
  }

  public async countProjectUserApiKeys(params: { userId: string; scope: Scope }): Promise<number> {
    const projectId = tryProjectIdFromScope(params.scope);
    if (!projectId) {
      return 0;
    }
    return this.scopeServices.projectUserApiKeys.countProjectUserApiKeys({
      projectId,
      userId: params.userId,
    });
  }

  /**
   * Returns role IDs that the user has in the given scope (project or organization).
   * Used by User.roles field resolver to avoid leaking global roles.
   */
  private async getUserTagIdsInScope(userId: string, scope: Scope): Promise<string[]> {
    const [scopedTagIds, userTags] = await Promise.all([
      this.getScopedTagIds(scope),
      this.userTags.getUserTags({ userId }),
    ]);
    const scopeTagIdSet = new Set(scopedTagIds);
    return userTags.map((ut) => ut.tagId).filter((tagId) => scopeTagIdSet.has(tagId));
  }

  public async getUserRoleIdsInScope(userId: string, scope: Scope): Promise<string[]> {
    switch (scope.tenant) {
      case Tenant.Account:
        return [];
      case Tenant.Organization: {
        const orgUsers = await this.scopeServices.organizationUsers.getOrganizationUsers({
          organizationId: scope.id,
          userId,
        });
        return orgUsers.length > 0 && orgUsers[0].roleId ? [orgUsers[0].roleId] : [];
      }
      case Tenant.OrganizationProject:
      case Tenant.AccountProject:
      case Tenant.OrganizationProjectUser:
      case Tenant.AccountProjectUser: {
        const projectId = this.extractProjectIdFromScope(scope);
        const [projectRoles, userRoleRows] = await Promise.all([
          this.scopeServices.projectRoles.getProjectRoles({ projectId }),
          this.scopeServices.userRoles.getUserRoles({ userId }),
        ]);
        const scopeRoleIds = new Set(projectRoles.map((pr) => pr.roleId));
        return userRoleRows.map((ur) => ur.roleId).filter((roleId) => scopeRoleIds.has(roleId));
      }
      default:
        return [];
    }
  }

  public async getUserRoles(
    params: { userId: string } & SelectedFields<User>
  ): Promise<Array<Role>> {
    const { userId, requestedFields } = params;
    const usersPage = await this.users.getUsers({ ids: [userId], requestedFields });
    if (Array.isArray(usersPage.users) && usersPage.users.length > 0) {
      return usersPage.users[0].roles || [];
    }
    return [];
  }

  public async getUserPermissions(params: { userId: string }): Promise<UserPermission[]> {
    return this.userPermissions.getUserPermissions({ userId: params.userId });
  }

  public async getUserGroups(params: { userId: string }): Promise<UserGroup[]> {
    return this.userGroups.getUserGroups({ userId: params.userId });
  }

  private async syncDirectUserGroupAdd(
    params: { userId: string; groupId: string; scope: Scope },
    tx: Transaction
  ): Promise<void> {
    const { userId, groupId, scope } = params;
    await this.userGroups.addUserGroup({ userId, groupId }, tx);

    switch (scope.tenant) {
      case Tenant.OrganizationProject:
      case Tenant.AccountProject: {
        const projectId = this.extractProjectIdFromScope(scope);
        await this.projectUserGroups.addProjectUserGroup({ projectId, userId, groupId }, tx);
        try {
          await this.projectGroups.addProjectGroup({ projectId, groupId }, tx);
        } catch {
          /* idempotent when group already linked to project */
        }
        break;
      }
    }
  }

  private async syncDirectUserGroupRemove(
    params: { userId: string; groupId: string; scope: Scope },
    tx: Transaction
  ): Promise<void> {
    const { userId, groupId, scope } = params;
    await this.userGroups.removeUserGroup({ userId, groupId }, tx);

    switch (scope.tenant) {
      case Tenant.OrganizationProject:
      case Tenant.AccountProject: {
        const projectId = this.extractProjectIdFromScope(scope);
        try {
          await this.projectUserGroups.removeProjectUserGroup({ projectId, userId, groupId }, tx);
        } catch {
          /* row may already be absent */
        }
        break;
      }
    }
  }

  private async syncDirectUserPermissionAdd(
    params: { userId: string; permissionId: string; scope: Scope },
    tx: Transaction
  ): Promise<UserPermission> {
    const { userId, permissionId, scope } = params;
    const userPermission = await this.userPermissions.assignUserPermission(
      { userId, permissionId, scope },
      tx
    );

    switch (scope.tenant) {
      case Tenant.OrganizationProject:
      case Tenant.AccountProject: {
        const projectId = this.extractProjectIdFromScope(scope);
        await this.projectUserPermissions.addProjectUserPermission(
          { projectId, userId, permissionId },
          tx
        );
        try {
          await this.projectPermissions.addProjectPermission({ projectId, permissionId }, tx);
        } catch {
          /* idempotent when permission already linked to project */
        }
        break;
      }
    }

    return userPermission;
  }

  public async countUserPermissions(params: { userId: string }): Promise<number> {
    return this.userPermissions.countUserPermissions(params);
  }

  public async assignUserPermission(params: AssignUserPermissionInput): Promise<UserPermission> {
    return await this.db.withTransaction(async (tx: Transaction) => {
      const userPermission = await this.syncDirectUserPermissionAdd(
        {
          userId: params.userId,
          permissionId: params.permissionId,
          scope: params.scope,
        },
        tx
      );
      await this.invalidatePermissionsCacheForAllScopes();
      return userPermission;
    });
  }

  public async revokeUserPermission(params: RevokeUserPermissionInput): Promise<UserPermission> {
    return await this.db.withTransaction(async (tx: Transaction) => {
      const { scope, userId, permissionId } = params;
      const userPermission = await this.userPermissions.revokeUserPermission(params, tx);

      switch (scope.tenant) {
        case Tenant.OrganizationProject:
        case Tenant.AccountProject: {
          const projectId = this.extractProjectIdFromScope(scope);
          try {
            await this.projectUserPermissions.removeProjectUserPermission(
              { projectId, userId, permissionId },
              tx
            );
          } catch {
            /* row may already be absent */
          }
          break;
        }
      }

      await this.invalidatePermissionsCacheForAllScopes();
      return userPermission;
    });
  }

  public async uploadUserPicture(
    params: UploadUserPictureHandlerParams
  ): Promise<{ url: string; path: string }> {
    const { userId, file, contentType, filename, scope, actorUserId } = params;

    if (isUnsupportedProjectUserMutationLeafTenant(scope.tenant)) {
      throw new BadRequestError(
        'Picture upload requires an OrganizationProject or AccountProject scope'
      );
    }

    const authMethods = await this.userAuthenticationMethods.getUserAuthenticationMethods({
      userId,
    });
    const targetHasAuthenticationMethods = authMethods.length > 0;
    this.assertSelfManagedIdentityMutationAllowed(
      actorUserId,
      userId,
      targetHasAuthenticationMethods
    );

    const fileBuffer = this.fileStorage.validateAndDecodeUpload({
      file,
      contentType,
      filename,
    });

    const storagePath = this.fileStorage.sanitizeExtensionAndGeneratePath(
      filename,
      `users/${userId}/picture`
    );

    return await this.db.withTransaction(async (tx: Transaction) => {
      const result = await this.fileStorage.upload(fileBuffer, storagePath, {
        contentType,
        public: true,
      });

      if (isParentProjectScopeForPivotWrites(scope.tenant)) {
        const projectId = this.extractProjectIdFromScope(scope);
        await this.projectUsers.updateProjectUserProfile(
          { projectId, userId, pictureUrl: result.url },
          tx
        );
        await this.invalidateAuthorizationResultsForUser(userId);
      } else {
        await this.users.updateUser(userId, { pictureUrl: result.url }, tx);
      }

      return {
        url: result.url,
        path: result.path,
      };
    });
  }
}
