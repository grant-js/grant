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
import { NotFoundError } from '@/lib/errors';
import { Transaction, TransactionManager } from '@/lib/transaction-manager.lib';
import { Services } from '@/services';
import { DeleteParams, SelectedFields } from '@/services/common';

import { ScopeHandler } from './base/scope-handler';

export interface UserDataExport {
  user: {
    id: string;
    name: string;
    email: string | null;
    createdAt: Date;
    updatedAt: Date;
  };
  accounts: Array<{
    id: string;
    name: string;
    slug: string;
    type: string;
    createdAt: Date;
    updatedAt: Date;
  }>;
  authenticationMethods: Array<{
    provider: string;
    providerId: string;
    isVerified: boolean;
    isPrimary: boolean;
    lastUsedAt: Date | null;
    createdAt: Date;
  }>;
  sessions: Array<{
    userAgent: string | null;
    ipAddress: string | null;
    lastUsedAt: Date | null;
    expiresAt: Date;
    createdAt: Date;
  }>;
  organizationMemberships: Array<{
    organizationId: string;
    organizationName: string;
    role: string;
    joinedAt: Date;
  }>;
  projectMemberships: Array<{
    projectId: string;
    projectName: string;
    role: string;
    joinedAt: Date;
  }>;
  exportedAt: Date;
}

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

  /**
   * Export all user data for GDPR compliance
   * Collects user profile, accounts, authentication methods, sessions,
   * organization memberships, and project memberships
   *
   * @param userId - User ID to export data for
   * @returns Structured user data export
   */
  public async exportUserData(userId: string): Promise<UserDataExport> {
    // Get user profile
    const userPage = await this.services.users.getUsers({
      ids: [userId],
      limit: 1,
      requestedFields: ['id', 'name', 'createdAt', 'updatedAt'],
    });

    if (!userPage.users || userPage.users.length === 0) {
      throw new NotFoundError('User not found', 'errors:notFound.user', { userId });
    }

    const user = userPage.users[0];

    // Get user's authentication methods
    const authMethods = await this.services.userAuthenticationMethods.getUserAuthenticationMethods({
      userId,
      requestedFields: [
        'provider',
        'providerId',
        'isVerified',
        'isPrimary',
        'lastUsedAt',
        'createdAt',
      ],
    });

    // Extract email from authentication methods
    const emailAuthMethod = authMethods.find((m) => m.provider === 'email');
    const userEmail = emailAuthMethod?.providerId || null;

    // Get accounts owned by user
    const accounts = await this.services.accounts.getAccountsByOwnerId(userId);

    // Format authentication methods (excluding sensitive data like hashed passwords)
    const authenticationMethodsData = authMethods.map((method) => ({
      provider: method.provider,
      providerId: method.providerId,
      isVerified: method.isVerified || false,
      isPrimary: method.isPrimary || false,
      lastUsedAt: method.lastUsedAt ? new Date(method.lastUsedAt) : null,
      createdAt: new Date(method.createdAt),
    }));

    // Get user sessions
    const sessionsPage = await this.services.userSessions.getUserSessions({
      userId,
      limit: -1,
      requestedFields: ['userAgent', 'ipAddress', 'lastUsedAt', 'expiresAt', 'createdAt'],
    });

    const sessionsData = (sessionsPage.userSessions || []).map((session) => ({
      userAgent: session.userAgent || null,
      ipAddress: session.ipAddress || null,
      lastUsedAt: session.lastUsedAt ? new Date(session.lastUsedAt) : null,
      expiresAt: new Date(session.expiresAt),
      createdAt: new Date(session.createdAt),
    }));

    // Get organization memberships with roles
    const organizationMembershipsRaw =
      await this.services.organizationUsers.getUserOrganizationMemberships(userId);

    // Get project memberships with roles
    const projectMembershipsRaw =
      await this.services.projectUsers.getUserProjectMemberships(userId);

    return {
      user: {
        id: user.id,
        name: user.name,
        email: userEmail,
        createdAt: new Date(user.createdAt),
        updatedAt: new Date(user.updatedAt),
      },
      accounts: accounts.map((account) => ({
        id: account.id,
        name: account.name,
        slug: account.slug,
        type: account.type,
        createdAt: new Date(account.createdAt),
        updatedAt: new Date(account.updatedAt),
      })),
      authenticationMethods: authenticationMethodsData,
      sessions: sessionsData,
      organizationMemberships: organizationMembershipsRaw.map((m) => ({
        organizationId: m.organizationId,
        organizationName: m.organizationName,
        role: m.role,
        joinedAt: m.joinedAt,
      })),
      projectMemberships: projectMembershipsRaw.map((m) => ({
        projectId: m.projectId,
        projectName: m.projectName,
        role: m.role,
        joinedAt: m.joinedAt,
      })),
      exportedAt: new Date(),
    };
  }
}
