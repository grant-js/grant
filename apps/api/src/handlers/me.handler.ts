import type {
  IAccountRoleService,
  IAccountService,
  IAuthService,
  IEmailService,
  IEventPublisher,
  IFileStorageServicePort,
  ILogger,
  IMeService,
  INotificationService,
  IOrganizationUserService,
  IProjectUserService,
  ITransactionalConnection,
  IUserAuthenticationMethodService,
  IUserMfaService,
  IUserRoleService,
  IUserService,
  IUserSessionService,
} from '@grantjs/core';
import { GrantAuth } from '@grantjs/core';
import { SupportedLocale } from '@grantjs/i18n';
import {
  Account,
  ConfirmMyProjectMembershipPictureUploadInput,
  ConfirmMyUserPictureUploadInput,
  CreateMyUserAuthenticationMethodInput,
  DeleteMyAccountsInput,
  ListNotificationsInput,
  MeResponse,
  MyProjectMembership,
  MyUserSessionsInput,
  NotificationPage,
  NotificationPreference,
  RequestMyProjectMembershipPictureUploadUrlInput,
  RequestMyUserPictureUploadUrlInput,
  SetNotificationPreferenceInput,
  SortOrder,
  UpdateMyProjectMembershipInput,
  UpdateMyUserInput,
  UploadMyProjectMembershipPictureInput,
  UploadMyUserPictureInput,
  UploadUrl,
  User,
  UserAuthenticationMethod,
  UserAuthenticationMethodProvider,
  UserDataExport,
  UserSessionSortableField,
} from '@grantjs/schema';

import { config } from '@/config';
import { authMethodHasPassword } from '@/lib/auth-method-public.lib';
import { IEntityCacheAdapter } from '@/lib/cache';
import { AuthenticationError, NotFoundError } from '@/lib/errors';
import { createLogger } from '@/lib/logger';
import { assertEmailProviderForDirectAuth } from '@/lib/oauth-direct-auth.lib';
import { Transaction } from '@/lib/transaction-manager.lib';
import { Otp } from '@/types';

import { CacheHandler, type ScopeServices } from './base/cache-handler';

export class MeHandler extends CacheHandler {
  protected readonly logger = createLogger('MeHandler');

  constructor(
    private readonly me: IMeService,
    private readonly accountRoles: IAccountRoleService,
    private readonly userRoles: IUserRoleService,
    private readonly accounts: IAccountService,
    private readonly users: IUserService,
    private readonly userAuthenticationMethods: IUserAuthenticationMethodService,
    private readonly userMfa: IUserMfaService,
    private readonly userSessions: IUserSessionService,
    private readonly fileStorage: IFileStorageServicePort,
    private readonly email: IEmailService,
    private readonly organizationUsers: IOrganizationUserService,
    private readonly projectUsers: IProjectUserService,
    private readonly auth: IAuthService,
    private readonly notifications: INotificationService,
    private readonly events: IEventPublisher,
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

  public async myNotifications(input: ListNotificationsInput): Promise<NotificationPage> {
    return this.notifications.list(this.getAuthenticatedUserId(), input);
  }

  public async myUnreadNotificationCount(): Promise<{ unreadCount: number }> {
    const unreadCount = await this.notifications.unreadCount(this.getAuthenticatedUserId());
    return { unreadCount };
  }

  public async markMyNotificationRead(id: string): Promise<void> {
    await this.notifications.markRead(this.getAuthenticatedUserId(), id);
  }

  public async markAllMyNotificationsRead(): Promise<{ updated: number }> {
    const updated = await this.notifications.markAllRead(this.getAuthenticatedUserId());
    return { updated };
  }

  public async myNotificationPreferences(scopeTenant: string): Promise<NotificationPreference[]> {
    return this.notifications.listPreferences(this.getAuthenticatedUserId(), scopeTenant);
  }

  public async setMyNotificationPreference(
    input: SetNotificationPreferenceInput
  ): Promise<NotificationPreference> {
    return this.notifications.setPreference(this.getAuthenticatedUserId(), input);
  }

  public async updateMyUser(input: UpdateMyUserInput): Promise<User> {
    const userId = this.getAuthenticatedUserId();
    return await this.users.updateUser(userId, input);
  }

  /**
   * Where the signed-in user's picture lives.
   *
   * Derived from the authenticated id, never from input — a client-supplied path
   * in a presigned URL is a cross-tenant write. Shared by the base64 mutation and
   * both halves of the direct-upload pair so they cannot come to disagree about
   * which object a confirmation is confirming.
   */
  private myUserPicturePath(userId: string, filename: string): string {
    return this.fileStorage.sanitizeExtensionAndGeneratePath(filename, `users/${userId}/picture`);
  }

  public async requestMyUserPictureUploadUrl(
    params: RequestMyUserPictureUploadUrlInput
  ): Promise<UploadUrl> {
    const userId = this.getAuthenticatedUserId();
    const { filename, contentType, contentLength } = params;

    // Before the URL exists, not after the bytes arrive — with a direct upload
    // there is no "after the bytes arrive" in this process.
    this.fileStorage.validateUploadRequest({ contentType, filename, contentLength });

    const minted = await this.fileStorage.getUploadUrl(this.myUserPicturePath(userId, filename), {
      contentType,
      contentLength,
      expiresInSeconds: config.storage.upload.urlExpirySeconds,
    });

    return {
      url: minted.url,
      method: minted.method,
      expiresAt: minted.expiresAt,
      headers: Object.entries(minted.headers).map(([name, value]) => ({ name, value })),
    };
  }

  public async confirmMyUserPictureUpload(
    params: ConfirmMyUserPictureUploadInput
  ): Promise<{ url: string; path: string }> {
    const userId = this.getAuthenticatedUserId();
    const storagePath = this.myUserPicturePath(userId, params.filename);

    // The store is the witness, not the client. An absent object means the PUT
    // never landed — refused for the wrong length, the wrong type, or an expired
    // URL — and nothing should be recorded against the user.
    await this.fileStorage.assertStoredWithinPolicy(storagePath);

    return await this.db.withTransaction(async (tx: Transaction) => {
      const url = await this.fileStorage.getUrl(storagePath);

      await this.users.updateUser(userId, { pictureUrl: url }, tx);

      return { url, path: storagePath };
    });
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

    const storagePath = this.myUserPicturePath(userId, filename);

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
    currentPassword?: string;
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
    const methods = await this.userAuthenticationMethods.getUserAuthenticationMethods({
      userId,
      requestedFields: [
        'id',
        'userId',
        'provider',
        'providerId',
        'providerData',
        'isVerified',
        'isPrimary',
        'lastUsedAt',
        'createdAt',
        'updatedAt',
      ],
    });

    return methods.map((method) => {
      const { providerData: _providerData, ...rest } = method;
      return {
        ...rest,
        hasPassword: authMethodHasPassword(method),
        providerData: {},
      };
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
        role: m.role ?? 'Member',
        joinedAt: m.joinedAt,
      })),
      exportedAt: new Date(),
    };

    return {
      data: exportData,
      filename: `user-data-${userId}-${Date.now()}.json`,
    };
  }

  public async myMfaDevices() {
    const userId = this.getAuthenticatedUserId();
    return this.userMfa.listDevices(userId);
  }

  public async myMfaRecoveryCodeStatus() {
    const userId = this.getAuthenticatedUserId();
    return this.userMfa.getMyMfaRecoveryCodeStatus(userId);
  }

  /** Used by MFA guards: any non-deleted enabled factor counts (not primary-only). */
  public async hasActiveMfaEnrollmentForUser(userId: string): Promise<boolean> {
    return this.userMfa.hasActiveMfaEnrollment(userId);
  }

  public async createMyMfaEnrollment(): Promise<{
    factorId: string;
    secret: string;
    otpAuthUrl: string;
  }> {
    const userId = this.getAuthenticatedUserId();
    return await this.db.withTransaction(async (tx: Transaction) => {
      const me = await this.me.getMe(tx);
      const accountLabel = me.email?.trim() || userId;
      return this.userMfa.setupTotp(userId, accountLabel, tx);
    });
  }

  public async verifyMyMfaEnrollment(code: string): Promise<boolean> {
    const auth = this.getGrantAuth();
    const result = await this.userMfa.verifyTotp(auth.userId, code);
    if (result.verified) {
      await this.userSessions.markMfaVerified(auth.tokenId);
    }
    return result.verified;
  }

  public async setMyPrimaryMfaDevice(factorId: string) {
    const userId = this.getAuthenticatedUserId();
    return this.userMfa.setPrimaryDevice(userId, factorId);
  }

  public async removeMyMfaDevice(factorId: string): Promise<boolean> {
    const userId = this.getAuthenticatedUserId();
    await this.userMfa.removeDevice(userId, factorId);
    return true;
  }

  public async generateMyMfaRecoveryCodes(factorId?: string | null): Promise<string[]> {
    const userId = this.getAuthenticatedUserId();
    return this.userMfa.generateRecoveryCodes(userId, factorId ?? null);
  }

  public async createMyUserAuthenticationMethod(
    input: CreateMyUserAuthenticationMethodInput,
    locale?: SupportedLocale,
    requestLogger?: ILogger
  ): Promise<UserAuthenticationMethod> {
    const userId = this.getAuthenticatedUserId();
    assertEmailProviderForDirectAuth(input.provider);
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
          await this.events.publish(
            {
              type: 'user.email_verification_requested',
              subjectUserId: userId,
              aggregate: { kind: 'userAuthenticationMethod', id: userAuthenticationMethod.id },
              data: { after: { provider: input.provider, providerId: input.providerId } },
            },
            tx
          );
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

  public async myProjectMemberships(): Promise<MyProjectMembership[]> {
    const userId = this.getAuthenticatedUserId();
    const rows = await this.projectUsers.getUserProjectMemberships(userId);
    return rows.map(toMyProjectMembership);
  }

  public async myProjectMembership(projectId: string): Promise<MyProjectMembership | null> {
    const userId = this.getAuthenticatedUserId();
    const rows = await this.projectUsers.getUserProjectMemberships(userId);
    const match = rows.find((row) => row.projectId === projectId);
    return match ? toMyProjectMembership(match) : null;
  }

  public async updateMyProjectMembership(
    input: UpdateMyProjectMembershipInput
  ): Promise<MyProjectMembership> {
    const userId = this.getAuthenticatedUserId();
    return await this.db.withTransaction(async (tx: Transaction) => {
      await this.projectUsers.updateProjectUserProfile(
        {
          projectId: input.projectId,
          userId,
          ...(input.displayName !== undefined ? { displayName: input.displayName } : {}),
          ...(input.pictureUrl !== undefined ? { pictureUrl: input.pictureUrl } : {}),
        },
        tx
      );

      const rows = await this.projectUsers.getUserProjectMemberships(userId, tx);
      const match = rows.find((row) => row.projectId === input.projectId);
      if (!match) {
        throw new NotFoundError('ProjectUser');
      }
      return toMyProjectMembership(match);
    });
  }

  /**
   * Where one project membership's picture lives. Derived from the authenticated
   * id and the project, never from input beyond the extension — shared by the
   * base64 mutation and both halves of the direct-upload pair.
   */
  private myProjectMembershipPicturePath(
    userId: string,
    projectId: string,
    filename: string
  ): string {
    return this.fileStorage.sanitizeExtensionAndGeneratePath(
      filename,
      `users/${userId}/projects/${projectId}/picture`
    );
  }

  /**
   * `projectId` is client-supplied and reaches the storage path, so membership is
   * not something to check only when the upload is recorded.
   *
   * The base64 mutation can check inside its transaction because the bytes and the
   * write arrive together. A minted URL separates them: it is a capability handed
   * out minutes before anything is written, so issuing one for a project the caller
   * does not belong to is the thing to prevent rather than to detect afterwards.
   */
  private async assertMyProjectMembership(
    userId: string,
    projectId: string,
    tx?: Transaction
  ): Promise<void> {
    const memberships = await this.projectUsers.getUserProjectMemberships(userId, tx);
    if (!memberships.some((m) => m.projectId === projectId)) {
      throw new NotFoundError('ProjectUser');
    }
  }

  public async requestMyProjectMembershipPictureUploadUrl(
    input: RequestMyProjectMembershipPictureUploadUrlInput
  ): Promise<UploadUrl> {
    const userId = this.getAuthenticatedUserId();
    const { projectId, filename, contentType, contentLength } = input;

    await this.assertMyProjectMembership(userId, projectId);
    this.fileStorage.validateUploadRequest({ contentType, filename, contentLength });

    const minted = await this.fileStorage.getUploadUrl(
      this.myProjectMembershipPicturePath(userId, projectId, filename),
      {
        contentType,
        contentLength,
        expiresInSeconds: config.storage.upload.urlExpirySeconds,
      }
    );

    return {
      url: minted.url,
      method: minted.method,
      expiresAt: minted.expiresAt,
      headers: Object.entries(minted.headers).map(([name, value]) => ({ name, value })),
    };
  }

  public async confirmMyProjectMembershipPictureUpload(
    input: ConfirmMyProjectMembershipPictureUploadInput
  ): Promise<{ url: string; path: string }> {
    const userId = this.getAuthenticatedUserId();
    const { projectId, filename } = input;
    const storagePath = this.myProjectMembershipPicturePath(userId, projectId, filename);

    await this.fileStorage.assertStoredWithinPolicy(storagePath);

    return await this.db.withTransaction(async (tx: Transaction) => {
      // Re-checked inside the transaction, and not only at mint time: membership can
      // be revoked while a URL is still live, and the write is what must not happen.
      await this.assertMyProjectMembership(userId, projectId, tx);

      const url = await this.fileStorage.getUrl(storagePath);

      await this.projectUsers.updateProjectUserProfile({ projectId, userId, pictureUrl: url }, tx);

      return { url, path: storagePath };
    });
  }

  public async uploadMyProjectMembershipPicture(
    input: UploadMyProjectMembershipPictureInput
  ): Promise<{ url: string; path: string }> {
    const userId = this.getAuthenticatedUserId();
    const { projectId, file, contentType, filename } = input;

    const fileBuffer = this.fileStorage.validateAndDecodeUpload({
      file,
      contentType,
      filename,
    });

    const storagePath = this.myProjectMembershipPicturePath(userId, projectId, filename);

    return await this.db.withTransaction(async (tx: Transaction) => {
      await this.assertMyProjectMembership(userId, projectId, tx);

      const result = await this.fileStorage.upload(fileBuffer, storagePath, {
        contentType,
        public: true,
      });

      await this.projectUsers.updateProjectUserProfile(
        { projectId, userId, pictureUrl: result.url },
        tx
      );

      return {
        url: result.url,
        path: result.path,
      };
    });
  }
}

function toMyProjectMembership(row: {
  projectId: string;
  projectName: string;
  displayName: string | null;
  pictureUrl: string | null;
  metadata: Record<string, unknown>;
  role: string | null;
  joinedAt: Date;
  organizationId: string | null;
  organizationName: string | null;
  accountId: string | null;
}): MyProjectMembership {
  return {
    projectId: row.projectId,
    projectName: row.projectName,
    displayName: row.displayName,
    pictureUrl: row.pictureUrl,
    metadata: row.metadata,
    role: row.role,
    joinedAt: row.joinedAt,
    organizationId: row.organizationId,
    organizationName: row.organizationName,
    accountId: row.accountId,
  };
}
