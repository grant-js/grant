import { DbSchema } from '@logusgraphics/grant-database';
import {
  MutationCreateUserArgs,
  MutationDeleteUserArgs,
  MutationUpdateUserArgs,
  QueryUsersArgs,
  Role,
  Tag,
  Tenant,
  User,
  UserAuthenticationMethodProvider,
  UserPage,
} from '@logusgraphics/grant-schema';

import { IEntityCacheAdapter } from '@/lib/cache';
import { Transaction, TransactionManager } from '@/lib/transaction-manager.lib';
import { Services } from '@/services';
import { DeleteParams, SelectedFields } from '@/services/common';

import { ScopeHandler } from './base/scope-handler';

export class UserHandler extends ScopeHandler {
  constructor(
    readonly scopeCache: IEntityCacheAdapter,
    readonly services: Services,
    readonly db: DbSchema
  ) {
    super(scopeCache, services);
  }

  public async getUsers(params: QueryUsersArgs & SelectedFields<User>): Promise<UserPage> {
    const { scope, page, limit, sort, search, ids, tagIds, requestedFields } = params;

    let userIds = await this.getScopedUserIds(scope);

    if (tagIds && tagIds.length > 0) {
      const userTags = await this.services.userTags.getUserTagIntersection(userIds, tagIds);
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

    const usersResult = await this.services.users.getUsers({
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
    return await TransactionManager.withTransaction(this.db, async (tx: Transaction) => {
      const { input } = params;
      const { name, scope, tagIds, roleIds, primaryTagId } = input;

      const user = await this.services.users.createUser({ name }, tx);
      const { id: userId } = user;
      switch (scope.tenant) {
        case Tenant.Organization:
          await this.services.organizationUsers.addOrganizationUser(
            { organizationId: scope.id, userId },
            tx
          );
          break;
        case Tenant.Project:
          await this.services.projectUsers.addProjectUser({ projectId: scope.id, userId }, tx);
          break;
      }

      if (roleIds && roleIds.length > 0) {
        await Promise.all(
          roleIds.map((roleId) => this.services.userRoles.addUserRole({ userId, roleId }, tx))
        );
      }

      if (tagIds && tagIds.length > 0) {
        await Promise.all(
          tagIds.map((tagId) =>
            this.services.userTags.addUserTag(
              { userId, tagId, isPrimary: tagId === primaryTagId },
              tx
            )
          )
        );
      }

      this.addUserIdToScopeCache(scope, userId);

      return user;
    });
  }

  public async updateUser(params: MutationUpdateUserArgs): Promise<User> {
    return await TransactionManager.withTransaction(this.db, async (tx: Transaction) => {
      const { id: userId, input } = params;
      const { roleIds, tagIds, primaryTagId } = input;
      let currentTagIds: string[] = [];
      let currentRoleIds: string[] = [];
      if (tagIds && tagIds.length > 0) {
        const currentTags = await this.services.userTags.getUserTags({ userId }, tx);
        currentTagIds = currentTags.map((pt) => pt.tagId);
      }
      if (roleIds && roleIds.length > 0) {
        const currentRoles = await this.services.userRoles.getUserRoles({ userId }, tx);
        currentRoleIds = currentRoles.map((ur) => ur.roleId);
      }
      const updatedUser = await this.services.users.updateUser(params, tx);
      if (tagIds && tagIds.length > 0) {
        const newTagIds = tagIds.filter((tagId) => !currentTagIds.includes(tagId));
        const removedTagIds = currentTagIds.filter((tagId) => !tagIds.includes(tagId));
        const updatedTagIds = tagIds.filter((tagId) => currentTagIds.includes(tagId));
        await Promise.all(
          newTagIds.map((tagId) =>
            this.services.userTags.addUserTag(
              { userId, tagId, isPrimary: tagId === primaryTagId },
              tx
            )
          )
        );
        await Promise.all(
          removedTagIds.map((tagId) => this.services.userTags.removeUserTag({ userId, tagId }, tx))
        );
        await Promise.all(
          updatedTagIds.map((tagId) =>
            this.services.userTags.updateUserTag(
              { userId, tagId, isPrimary: tagId === primaryTagId },
              tx
            )
          )
        );
      }
      if (roleIds && roleIds.length > 0) {
        const newRoleIds = roleIds.filter((roleId) => !currentRoleIds.includes(roleId));
        const removedRoleIds = currentRoleIds.filter((roleId) => !roleIds.includes(roleId));
        await Promise.all(
          newRoleIds.map((roleId) => this.services.userRoles.addUserRole({ userId, roleId }, tx))
        );
        await Promise.all(
          removedRoleIds.map((roleId) =>
            this.services.userRoles.removeUserRole({ userId, roleId }, tx)
          )
        );
      }
      return updatedUser;
    });
  }

  public async deleteUser(params: MutationDeleteUserArgs & DeleteParams): Promise<User> {
    return await TransactionManager.withTransaction(this.db, async (tx: Transaction) => {
      const userId = params.id;
      const scope = params.scope;
      const [userTags, userRoles] = await Promise.all([
        this.services.userTags.getUserTags({ userId }, tx),
        this.services.userRoles.getUserRoles({ userId }, tx),
      ]);

      const tagIds = userTags.map((ut) => ut.tagId);
      const roleIds = userRoles.map((ur) => ur.roleId);
      switch (scope.tenant) {
        case Tenant.Organization:
          await this.services.organizationUsers.removeOrganizationUser(
            { organizationId: scope.id, userId },
            tx
          );
          break;
        case Tenant.Project:
          await this.services.projectUsers.removeProjectUser({ projectId: scope.id, userId }, tx);
          break;
      }

      await Promise.all([
        ...tagIds.map((tagId) => this.services.userTags.removeUserTag({ userId, tagId }, tx)),
        ...roleIds.map((roleId) => this.services.userRoles.removeUserRole({ userId, roleId }, tx)),
      ]);

      this.removeUserIdFromScopeCache(scope, userId);

      return await this.services.users.deleteUser(params, tx);
    });
  }

  public async getUserTags(params: { userId: string } & SelectedFields<User>): Promise<Array<Tag>> {
    const { userId, requestedFields } = params;
    const usersPage = await this.services.users.getUsers({ ids: [userId], requestedFields });
    if (Array.isArray(usersPage.users) && usersPage.users.length > 0) {
      return usersPage.users[0].tags || [];
    }
    return [];
  }

  public async getUserRoles(
    params: { userId: string } & SelectedFields<User>
  ): Promise<Array<Role>> {
    const { userId, requestedFields } = params;
    const usersPage = await this.services.users.getUsers({ ids: [userId], requestedFields });
    if (Array.isArray(usersPage.users) && usersPage.users.length > 0) {
      return usersPage.users[0].roles || [];
    }
    return [];
  }

  public async uploadUserPicture(params: {
    userId: string;
    file: Buffer;
    contentType: string;
    filename: string;
  }): Promise<{ url: string; path: string }> {
    return await TransactionManager.withTransaction(this.db, async (tx: Transaction) => {
      const { userId, file, contentType, filename } = params;

      const ext = filename.split('.').pop()?.toLowerCase() || 'jpg';
      const sanitizedExt = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext) ? ext : 'jpg';
      const storagePath = `users/${userId}/picture.${sanitizedExt}`;

      const result = await this.services.fileStorage.upload(file, storagePath, {
        contentType,
        public: true,
      });

      await this.services.users.updateUser(
        {
          id: userId,
          input: { pictureUrl: result.url },
        },
        tx
      );

      return {
        url: result.url,
        path: result.path,
      };
    });
  }

  public async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<void> {
    return await TransactionManager.withTransaction(this.db, async (tx: Transaction) => {
      await this.services.userAuthenticationMethods.changePassword(
        userId,
        currentPassword,
        newPassword,
        tx
      );
    });
  }

  public async getUserAuthenticationMethods(params: {
    userId: string;
    provider?: UserAuthenticationMethodProvider;
  }) {
    return await this.services.userAuthenticationMethods.getUserAuthenticationMethods({
      userId: params.userId,
      provider: params.provider,
      requestedFields: [
        'id',
        'userId',
        'provider',
        'providerId',
        'isVerified',
        'isPrimary',
        'lastUsedAt',
        'createdAt',
        'updatedAt',
      ],
    });
  }

  public async getUserSessions(params: {
    userId: string;
    audience?: string;
    page?: number;
    limit?: number;
  }) {
    return await this.services.userSessions.getUserSessions({
      userId: params.userId,
      audience: params.audience,
      page: params.page,
      limit: params.limit,
      requestedFields: [
        'id',
        'userId',
        'userAuthenticationMethodId',
        'token',
        'audience',
        'expiresAt',
        'lastUsedAt',
        'userAgent',
        'ipAddress',
        'createdAt',
        'updatedAt',
      ],
    });
  }

  public async revokeUserSession(sessionId: string) {
    return await this.services.userSessions.revokeSession(sessionId);
  }
}
