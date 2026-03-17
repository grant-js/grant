import {
  MutationCreateUserArgs,
  MutationDeleteUserArgs,
  MutationUpdateUserArgs,
  QueryUsersArgs,
  Role,
  Scope,
  Tag,
  Tenant,
  UploadUserPictureInput,
  User,
  UserPage,
} from '@grantjs/schema';

import { IEntityCacheAdapter } from '@/lib/cache';
import { BadRequestError, NotFoundError } from '@/lib/errors';
import { createLogger } from '@/lib/logger';
import { Transaction } from '@/lib/transaction-manager.lib';
import { DeleteParams, SelectedFields } from '@/types';

import { CacheHandler, type ScopeServices } from './base/cache-handler';

import type {
  IFileStorageServicePort,
  IOrganizationUserService,
  IProjectUserService,
  ITransactionalConnection,
  IUserRoleService,
  IUserService,
  IUserTagService,
} from '@grantjs/core';

export class UserHandler extends CacheHandler {
  protected readonly logger = createLogger('UserHandler');

  constructor(
    private readonly userTags: IUserTagService,
    private readonly users: IUserService,
    private readonly organizationUsers: IOrganizationUserService,
    private readonly projectUsers: IProjectUserService,
    private readonly userRoles: IUserRoleService,
    private readonly fileStorage: IFileStorageServicePort,
    cache: IEntityCacheAdapter,
    scopeServices: ScopeServices,
    private readonly db: ITransactionalConnection<Transaction>
  ) {
    super(cache, scopeServices);
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

    const usersResult = await this.users.getUsers({
      ids: userIds,
      page,
      limit,
      sort,
      search,
      requestedFields,
    });

    return usersResult;
  }

  public async createUser(params: MutationCreateUserArgs): Promise<User> {
    return await this.db.withTransaction(async (tx: Transaction) => {
      const { input } = params;
      const { name, scope, tagIds, roleIds, primaryTagId } = input;

      const user = await this.users.createUser({ name }, tx);
      const { id: userId } = user;
      switch (scope.tenant) {
        case Tenant.Organization:
          await this.organizationUsers.addOrganizationUser(
            { organizationId: scope.id, userId },
            tx
          );
          break;
        case Tenant.OrganizationProject:
        case Tenant.AccountProject: {
          const projectId = this.extractProjectIdFromScope(scope);
          await this.projectUsers.addProjectUser({ projectId, userId }, tx);
          break;
        }
      }

      if (roleIds && roleIds.length > 0) {
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

      this.addUserIdToScopeCache(scope, userId);

      return user;
    });
  }

  public async updateUser(params: MutationUpdateUserArgs): Promise<User> {
    return await this.db.withTransaction(async (tx: Transaction) => {
      const { id: userId, input } = params;
      const { roleIds, tagIds, primaryTagId, scope } = input;
      let currentTagIds: string[] = [];
      let currentRoleIds: string[] = [];
      if (Array.isArray(tagIds)) {
        const currentTags = await this.userTags.getUserTags({ userId }, tx);
        currentTagIds = currentTags.map((pt) => pt.tagId);
      }
      if (Array.isArray(roleIds)) {
        currentRoleIds = await this.getUserRoleIdsInScope(userId, scope);
      }
      const updatedUser = await this.users.updateUser(userId, input, tx);
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
      return updatedUser;
    });
  }

  public async deleteUser(params: MutationDeleteUserArgs & DeleteParams): Promise<User> {
    return await this.db.withTransaction(async (tx: Transaction) => {
      const userId = params.id;
      const scope = params.scope;

      switch (scope.tenant) {
        case Tenant.Organization: {
          const [userTags, scopedRoleIds] = await Promise.all([
            this.userTags.getUserTags({ userId }, tx),
            this.getUserRoleIdsInScope(userId, scope),
          ]);
          const tagIds = userTags.map((ut) => ut.tagId);
          await this.organizationUsers.removeOrganizationUser(
            { organizationId: scope.id, userId },
            tx
          );
          await Promise.all([
            ...tagIds.map((tagId) => this.userTags.removeUserTag({ userId, tagId }, tx)),
            ...scopedRoleIds.map((roleId) => this.userRoles.removeUserRole({ userId, roleId }, tx)),
          ]);
          await this.removeUserIdFromScopeCache(scope, userId);
          return await this.users.deleteUser(params, tx);
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
   * Returns role IDs that the user has in the given scope (project or organization).
   * Used by User.roles field resolver to avoid leaking global roles.
   */
  public async getUserRoleIdsInScope(userId: string, scope: Scope): Promise<string[]> {
    switch (scope.tenant) {
      case Tenant.Account:
        return [];
      case Tenant.Organization: {
        const [orgRoles, userRoleRows] = await Promise.all([
          this.scopeServices.organizationRoles.getOrganizationRoles({
            organizationId: scope.id,
          }),
          this.scopeServices.userRoles.getUserRoles({ userId }),
        ]);
        const scopeRoleIds = new Set(orgRoles.map((or) => or.roleId));
        return userRoleRows.map((ur) => ur.roleId).filter((roleId) => scopeRoleIds.has(roleId));
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

  public async uploadUserPicture(
    params: UploadUserPictureInput
  ): Promise<{ url: string; path: string }> {
    const { userId, file, contentType, filename } = params;

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

      await this.users.updateUser(userId, { pictureUrl: result.url }, tx);

      return {
        url: result.url,
        path: result.path,
      };
    });
  }
}
