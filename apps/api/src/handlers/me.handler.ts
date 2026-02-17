import { GrantAuth } from '@grantjs/core';
import { SupportedLocale } from '@grantjs/i18n';
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
import { createLogger } from '@/lib/logger';
import { Transaction } from '@/lib/transaction-manager.lib';
import { Otp } from '@/types';

import { CacheHandler, type ScopeServices } from './base/cache-handler';

import type {
  IAccountRoleService,
  IAccountService,
  IAuthService,
  IEmailService,
  IFileStorageServicePort,
  ILogger,
  IMeService,
  IOrganizationUserService,
  IProjectUserService,
  ITransactionalConnection,
  IUserAuthenticationMethodService,
  IUserRoleService,
  IUserService,
  IUserSessionService,
} from '@grantjs/core';

export class MeHandler extends CacheHandler {
  protected readonly logger = createLogger('MeHandler');

  constructor(
    private readonly me: IMeService,
    private readonly accountRoles: IAccountRoleService,
    private readonly userRoles: IUserRoleService,
    private readonly accounts: IAccountService,
    private readonly users: IUserService,
    private readonly userAuthenticationMethods: IUserAuthenticationMethodService,
    private readonly userSessions: IUserSessionService,
    private readonly fileStorage: IFileStorageServicePort,
    private readonly email: IEmailService,
    private readonly organizationUsers: IOrganizationUserService,
    private readonly projectUsers: IProjectUserService,
    private readonly auth: IAuthService,
    cache: IEntityCacheAdapter,
    scopeServices: ScopeServices,
    private readonly db: ITransactionalConnection<Transaction>
  ) {
    super(cache, scopeServices);
  }

  public async getMe(): Promise<MeResponse> {
    return await this.db.withTransaction(async (tx: Transaction) => {
      return await this.me.getMe(tx);
    });
  }

  public async createMySecondaryAccount(): Promise<{ account: Account; accounts: Account[] }> {
    return await this.db.withTransaction(async (tx: Transaction) => {
      const result = await this.me.createMySecondaryAccount(tx);

      const seededRoles = await this.accountRoles.seedAccountRoles(result.account.id, tx);

      const userId = result.account.ownerId;

      // Assign the seeded account owner role to the user (if they don't already have it)
      const accountOwnerRole = seededRoles[0]; // Only one role is seeded per account
      if (accountOwnerRole) {
        const userRoles = await this.userRoles.getUserRoles({ userId }, tx);
        const hasAccountOwnerRole = userRoles.some((ur) => ur.roleId === accountOwnerRole.role.id);
        if (!hasAccountOwnerRole) {
          await this.userRoles.addUserRole({ userId, roleId: accountOwnerRole.role.id }, tx);
        }
      }

      return result;
    });
  }

  public async deleteMyAccounts(params: DeleteMyAccountsInput): Promise<User> {
    return await this.db.withTransaction(async (tx: Transaction) => {
      const hardDelete = params.hardDelete ?? false;

      const userAccounts = await this.accounts.getOwnerAccounts(tx);

      await Promise.all(
        userAccounts.map((account: Account) =>
          this.accounts.deleteAccount(
            {
              id: account.id,
              hardDelete: hardDelete ?? false,
            },
            tx
          )
        )
      );

      const deletedUser = await this.users.deleteOwnUser({ hardDelete: hardDelete ?? false }, tx);

      return deletedUser;
    });
  }

  private getGrantAuth(): GrantAuth {
    const auth = this.auth.getAuth();
    if (!auth) {
      throw new AuthenticationError('Not authenticated');
    }
    return auth;
  }

  private getAuthenticatedUserId(): string {
    const auth = this.getGrantAuth();
    return auth.userId;
  }

  public async updateMyUser(input: UpdateMyUserInput): Promise<User> {
    const userId = this.getAuthenticatedUserId();
    return await this.users.updateUser(userId, input);
  }

  public async uploadMyUserPicture(
    params: UploadMyUserPictureInput
  ): Promise<{ url: string; path: string }> {
    const userId = this.getAuthenticatedUserId();
    const { file, contentType, filename } = params;

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

  public async changeMyPassword(params: {
    currentPassword: string;
    newPassword: string;
  }): Promise<void> {
    const userId = this.getAuthenticatedUserId();
    return await this.db.withTransaction(async (tx: Transaction) => {
      await this.userAuthenticationMethods.changePassword(
        userId,
        params.currentPassword,
        params.newPassword,
        tx
      );
    });
  }

  public async myUserAuthenticationMethods(): Promise<UserAuthenticationMethod[]> {
    const userId = this.getAuthenticatedUserId();
    return await this.userAuthenticationMethods.getUserAuthenticationMethods({
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
    return await this.userSessions.getUserSessions({
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

    const sessions = await this.userSessions.getUserSessions({
      userId,
      ids: [sessionId],
      limit: 1,
      requestedFields: ['id', 'userId'],
    });

    if (!sessions.userSessions || sessions.userSessions.length === 0) {
      throw new NotFoundError('Session');
    }

    const session = sessions.userSessions[0];

    if (session.userId !== userId) {
      throw new NotFoundError('Session');
    }

    await this.userSessions.revokeSession(sessionId);
  }

  public async myUserDataExport(): Promise<{ data: UserDataExport; filename: string }> {
    const userId = this.getAuthenticatedUserId();
    const userPage = await this.users.getUsers({
      ids: [userId],
      limit: 1,
      requestedFields: ['id', 'name', 'createdAt', 'updatedAt'],
    });

    if (!userPage.users || userPage.users.length === 0) {
      throw new NotFoundError('User', userId);
    }

    const user = userPage.users[0];

    const authMethods = await this.userAuthenticationMethods.getUserAuthenticationMethods({
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

    const accounts = await this.accounts.getAccountsByOwnerId(userId);

    const authenticationMethodsData = authMethods.map((method) => ({
      provider: method.provider,
      providerId: method.providerId,
      isVerified: method.isVerified || false,
      isPrimary: method.isPrimary || false,
      lastUsedAt: method.lastUsedAt ? new Date(method.lastUsedAt) : null,
      createdAt: new Date(method.createdAt),
    }));

    const sessionsPage = await this.userSessions.getUserSessions({
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
      await this.organizationUsers.getUserOrganizationMemberships(userId);

    const projectMembershipsRaw = await this.projectUsers.getUserProjectMemberships(userId);

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
    locale?: SupportedLocale,
    requestLogger?: ILogger
  ): Promise<UserAuthenticationMethod> {
    const userId = this.getAuthenticatedUserId();
    return await this.db.withTransaction(async (tx: Transaction) => {
      const { providerData: processedProviderData, isVerified } =
        await this.userAuthenticationMethods.processProvider(
          input.provider,
          input.providerId,
          input.providerData
        );

      const userAuthenticationMethod =
        await this.userAuthenticationMethods.createUserAuthenticationMethod(
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
            await this.email.sendOtp({
              to: input.providerId,
              token,
              validUntil,
              locale: locale || 'en',
            });
          } catch (error) {
            (requestLogger ?? this.logger).error({
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
    return await this.db.withTransaction(async (tx: Transaction) =>
      this.userAuthenticationMethods.setPrimaryAuthenticationMethod(userId, methodId, tx)
    );
  }

  public async deleteMyUserAuthenticationMethod(id: string): Promise<UserAuthenticationMethod> {
    const userId = this.getAuthenticatedUserId();
    return await this.db.withTransaction(async (tx: Transaction) => {
      const userAuthenticationMethod =
        await this.userAuthenticationMethods.getUserAuthenticationMethod(id);
      if (userAuthenticationMethod.userId !== userId) {
        throw new NotFoundError('UserAuthenticationMethod', id);
      }
      return this.userAuthenticationMethods.deleteUserAuthenticationMethod({ id }, tx);
    });
  }

  public async logout(): Promise<void> {
    const auth = this.getGrantAuth();
    return await this.db.withTransaction(async (tx: Transaction) => {
      const session = await this.userSessions.getUserSession(auth.tokenId);
      await this.userSessions.revokeSession(session.id, tx);
    });
  }
}
