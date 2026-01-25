import { SupportedLocale } from '@grantjs/constants';
import { GrantAuth } from '@grantjs/core';
import { DbSchema } from '@grantjs/database';
import {
  Account,
  CreateMyUserAuthenticationMethodInput,
  DeleteMyAccountsInput,
  MeResponse,
  MyUserSessionsInput,
  SortOrder,
  UpdateMyUserInput,
  UploadMyUserPictureInput,
  User,
  UserAuthenticationMethod,
  UserAuthenticationMethodProvider,
  UserDataExport,
  UserSessionSortableField,
} from '@grantjs/schema';

import { IEntityCacheAdapter } from '@/lib/cache';
import { AuthenticationError, NotFoundError } from '@/lib/errors';
import { createModuleLogger } from '@/lib/logger';
import { Transaction, TransactionManager } from '@/lib/transaction-manager.lib';
import { Services } from '@/services';
import { Otp } from '@/services/user-authentication-methods.service';

import { CacheHandler } from './base/cache-handler';

export class MeHandler extends CacheHandler {
  protected readonly logger = createModuleLogger('MeHandler');

  constructor(
    readonly cache: IEntityCacheAdapter,
    readonly services: Services,
    readonly db: DbSchema
  ) {
    super(cache, services);
  }

  public async getMe(): Promise<MeResponse> {
    return await TransactionManager.withTransaction(this.db, async (tx: Transaction) => {
      return await this.services.me.getMe(tx);
    });
  }

  public async createMySecondaryAccount(): Promise<{ account: Account; accounts: Account[] }> {
    return await TransactionManager.withTransaction(this.db, async (tx: Transaction) => {
      const result = await this.services.me.createMySecondaryAccount(tx);

      const seededRoles = await this.services.accountRoles.seedAccountRoles(result.account.id, tx);

      const userId = result.account.ownerId;

      // Assign the seeded account owner role to the user (if they don't already have it)
      const accountOwnerRole = seededRoles[0]; // Only one role is seeded per account
      if (accountOwnerRole) {
        const userRoles = await this.services.userRoles.getUserRoles({ userId }, tx);
        const hasAccountOwnerRole = userRoles.some((ur) => ur.roleId === accountOwnerRole.role.id);
        if (!hasAccountOwnerRole) {
          await this.services.userRoles.addUserRole(
            { userId, roleId: accountOwnerRole.role.id },
            tx
          );
        }
      }

      return result;
    });
  }

  public async deleteMyAccounts(params: DeleteMyAccountsInput): Promise<User> {
    return await TransactionManager.withTransaction(this.db, async (tx: Transaction) => {
      const hardDelete = params.hardDelete ?? false;

      const userAccounts = await this.services.accounts.getOwnerAccounts(tx);

      await Promise.all(
        userAccounts.map((account: Account) =>
          this.services.accounts.deleteAccount(
            {
              id: account.id,
              hardDelete: hardDelete ?? false,
            },
            tx
          )
        )
      );

      const deletedUser = await this.services.users.deleteOwnUser(
        { hardDelete: hardDelete ?? false },
        tx
      );

      return deletedUser;
    });
  }

  private getGrantAuth(): GrantAuth {
    const auth = this.services.auth.getAuth();
    if (!auth) {
      throw new AuthenticationError('Not authenticated', 'errors:auth.notAuthenticated');
    }
    return auth;
  }

  private getAuthenticatedUserId(): string {
    const auth = this.getGrantAuth();
    return auth.userId;
  }

  public async updateMyUser(input: UpdateMyUserInput): Promise<User> {
    const userId = this.getAuthenticatedUserId();
    return await this.services.users.updateUser(userId, input);
  }

  public async uploadMyUserPicture(
    params: UploadMyUserPictureInput
  ): Promise<{ url: string; path: string }> {
    const userId = this.getAuthenticatedUserId();
    const { file, contentType, filename } = params;

    const fileBuffer = this.services.fileStorage.validateAndDecodeUpload({
      file,
      contentType,
      filename,
    });

    const storagePath = this.services.fileStorage.sanitizeExtensionAndGeneratePath(
      filename,
      `users/${userId}/picture`
    );

    return await TransactionManager.withTransaction(this.db, async (tx: Transaction) => {
      const result = await this.services.fileStorage.upload(fileBuffer, storagePath, {
        contentType,
        public: true,
      });

      await this.services.users.updateUser(userId, { pictureUrl: result.url }, tx);

      return {
        url: result.url,
        path: result.path,
      };
    });
  }

  public async changeMyPassword(params: {
    currentPassword: string;
    newPassword: string;
  }): Promise<void> {
    const userId = this.getAuthenticatedUserId();
    return await TransactionManager.withTransaction(this.db, async (tx: Transaction) => {
      await this.services.userAuthenticationMethods.changePassword(
        userId,
        params.currentPassword,
        params.newPassword,
        tx
      );
    });
  }

  public async myUserAuthenticationMethods(): Promise<UserAuthenticationMethod[]> {
    const userId = this.getAuthenticatedUserId();
    return await this.services.userAuthenticationMethods.getUserAuthenticationMethods({
      userId,
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

  public async myUserSessions(params: MyUserSessionsInput) {
    const userId = this.getAuthenticatedUserId();
    return await this.services.userSessions.getUserSessions({
      userId,
      page: params.page,
      search: params.search,
      limit: params.limit,
      sort: {
        field: UserSessionSortableField.LastUsedAt,
        order: SortOrder.Desc,
      },
      audience: params.audience,
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

  public async revokeMyUserSession(sessionId: string): Promise<void> {
    const userId = this.getAuthenticatedUserId();

    const sessions = await this.services.userSessions.getUserSessions({
      userId,
      ids: [sessionId],
      limit: 1,
      requestedFields: ['id', 'userId'],
    });

    if (!sessions.userSessions || sessions.userSessions.length === 0) {
      throw new NotFoundError('Session not found', 'errors:common.notFound');
    }

    const session = sessions.userSessions[0];

    if (session.userId !== userId) {
      throw new NotFoundError('You can only revoke your own sessions', 'errors:auth.unauthorized');
    }

    await this.services.userSessions.revokeSession(sessionId);
  }

  public async myUserDataExport(): Promise<{ data: UserDataExport; filename: string }> {
    const userId = this.getAuthenticatedUserId();
    const userPage = await this.services.users.getUsers({
      ids: [userId],
      limit: 1,
      requestedFields: ['id', 'name', 'createdAt', 'updatedAt'],
    });

    if (!userPage.users || userPage.users.length === 0) {
      throw new NotFoundError('User not found', 'errors:notFound.user', { userId });
    }

    const user = userPage.users[0];

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

    const emailAuthMethod = authMethods.find((m) => m.provider === 'email');
    const userEmail = emailAuthMethod?.providerId || null;

    const accounts = await this.services.accounts.getAccountsByOwnerId(userId);

    const authenticationMethodsData = authMethods.map((method) => ({
      provider: method.provider,
      providerId: method.providerId,
      isVerified: method.isVerified || false,
      isPrimary: method.isPrimary || false,
      lastUsedAt: method.lastUsedAt ? new Date(method.lastUsedAt) : null,
      createdAt: new Date(method.createdAt),
    }));

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

    const organizationMembershipsRaw =
      await this.services.organizationUsers.getUserOrganizationMemberships(userId);

    const projectMembershipsRaw =
      await this.services.projectUsers.getUserProjectMemberships(userId);

    const exportData: UserDataExport = {
      user: {
        id: user.id,
        name: user.name,
        email: userEmail,
        createdAt: new Date(user.createdAt),
        updatedAt: new Date(user.updatedAt),
      },
      accounts: accounts.map((account) => ({
        id: account.id,
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

    return {
      data: exportData,
      filename: `user-data-${userId}-${Date.now()}.json`,
    };
  }

  public async createMyUserAuthenticationMethod(
    input: CreateMyUserAuthenticationMethodInput,
    locale?: SupportedLocale
  ): Promise<UserAuthenticationMethod> {
    const userId = this.getAuthenticatedUserId();
    return await TransactionManager.withTransaction(this.db, async (tx: Transaction) => {
      const { providerData: processedProviderData, isVerified } =
        await this.services.userAuthenticationMethods.processProvider(
          input.provider,
          input.providerId,
          input.providerData
        );

      const userAuthenticationMethod =
        await this.services.userAuthenticationMethods.createUserAuthenticationMethod(
          {
            userId,
            provider: input.provider,
            providerId: input.providerId,
            providerData: processedProviderData,
            isVerified: input.isVerified ?? isVerified,
            isPrimary: input.isPrimary,
          },
          tx
        );

      if (input.provider === UserAuthenticationMethodProvider.Email) {
        const { token, validUntil } = processedProviderData.otp as Otp;
        if (token && validUntil > Date.now()) {
          try {
            await this.services.email.sendOtp({
              to: input.providerId,
              token,
              validUntil,
              locale: locale || 'en',
            });
          } catch (error) {
            this.logger.error({
              msg: 'Error sending OTP email for new authentication method',
              err: error,
              userId,
              providerId: input.providerId,
            });
          }
        }
      }

      return userAuthenticationMethod;
    });
  }

  public async setMyPrimaryAuthenticationMethod(
    methodId: string
  ): Promise<UserAuthenticationMethod> {
    const userId = this.getAuthenticatedUserId();
    return await TransactionManager.withTransaction(this.db, async (tx: Transaction) =>
      this.services.userAuthenticationMethods.setPrimaryAuthenticationMethod(userId, methodId, tx)
    );
  }

  public async deleteMyUserAuthenticationMethod(id: string): Promise<UserAuthenticationMethod> {
    const userId = this.getAuthenticatedUserId();
    return await TransactionManager.withTransaction(this.db, async (tx: Transaction) => {
      const userAuthenticationMethod =
        await this.services.userAuthenticationMethods.getUserAuthenticationMethod(id);
      if (userAuthenticationMethod.userId !== userId) {
        throw new NotFoundError(
          'User authentication method not found',
          'errors:notFound.userAuthenticationMethod',
          { id }
        );
      }
      return this.services.userAuthenticationMethods.deleteUserAuthenticationMethod({ id }, tx);
    });
  }

  public async logout(): Promise<void> {
    const auth = this.getGrantAuth();
    return await TransactionManager.withTransaction(this.db, async (tx: Transaction) => {
      const session = await this.services.userSessions.getUserSession(auth.tokenId);
      await this.services.userSessions.revokeSession(session.id, tx);
    });
  }
}
