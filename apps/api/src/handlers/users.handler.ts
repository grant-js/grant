import { ResourceAction, ResourceSlug } from '@grantjs/constants';
import type {
  IAuthService,
  ICredentialService,
  IEmailService,
  IFileStorageServicePort,
  IOrganizationUserService,
  IProjectGroupService,
  IProjectOAuthGrantService,
  IProjectPermissionService,
  IProjectService,
  IProjectUserCredentialExportService,
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
  ConfirmUserPictureUploadInput,
  CredentialKind,
  MutationCreateUserArgs,
  MutationDeleteUserArgs,
  MutationSetProjectUserEmailArgs,
  MutationSetProjectUserPasswordArgs,
  MutationUpdateUserArgs,
  ProjectUserCredentialExport,
  ProjectUserPasswordCredential,
  QueryExportProjectUserCredentialsArgs,
  QueryUsersArgs,
  RequestUserPictureUploadUrlInput,
  RevokeUserPermissionInput,
  Role,
  Scope,
  Tag,
  Tenant,
  UpdateUserInput,
  UploadUrl,
  UploadUserPictureInput,
  User,
  UserGroup,
  UserPage,
  UserPermission,
} from '@grantjs/schema';

import { config } from '@/config';
import { type UserListHydrationContext, userListHydrators } from '@/hydrators/users.hydrators';
import type { ScheduleAfterCommit } from '@/lib/after-commit.lib';
import { IEntityCacheAdapter } from '@/lib/cache';
import {
  isParentProjectScopeForPivotWrites,
  isProjectScopedUserMetadataTenant,
  isUnsupportedProjectUserMutationLeafTenant,
  mergeEffectiveUserMetadataForProject,
  mergeEffectiveUserProfileForProject,
  toMetadataRecord,
} from '@/lib/effective-project-user-metadata.lib';
import {
  AuthenticationError,
  AuthorizationError,
  BadRequestError,
  NotFoundError,
  ValidationError,
} from '@/lib/errors';
import { hydrateList, stripHydratedFields } from '@/lib/list-hydration/list-hydration.lib';
import { createLogger } from '@/lib/logger';
import { assertProjectPivotMetadataMutationAllowed } from '@/lib/project-pivot-metadata-auth.lib';
import { tryProjectIdFromScope } from '@/lib/scope.lib';
import { Transaction } from '@/lib/transaction-manager.lib';
import { DeleteParams, SelectedFields } from '@/types';

import { CacheHandler, type ScopeServices } from './base/cache-handler';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type UpdateUserHandlerParams = MutationUpdateUserArgs & { actorUserId: string };

export type UploadUserPictureHandlerParams = UploadUserPictureInput & { actorUserId: string };

export type RequestUserPictureUploadUrlHandlerParams = RequestUserPictureUploadUrlInput & {
  actorUserId: string;
};

export type ConfirmUserPictureUploadHandlerParams = ConfirmUserPictureUploadInput & {
  actorUserId: string;
};

export class UserHandler extends CacheHandler {
  private readonly logger = createLogger('UserHandler');

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
    private readonly db: ITransactionalConnection<Transaction>,
    private readonly auth: IAuthService,
    private readonly credentials: ICredentialService,
    private readonly projectOAuthGrants: IProjectOAuthGrantService,
    private readonly credentialExports: IProjectUserCredentialExportService,
    private readonly email: IEmailService,
    private readonly projects: IProjectService,
    private readonly scheduleAfterCommit?: ScheduleAfterCommit
  ) {
    super(cache, scopeServices);
  }

  /**
   * Tell the previous address that an operator changed the login e-mail. The notification
   * system cannot: it resolves recipients by user id, and the id now points at the new
   * address. Queued until the transaction commits, so a rolled-back change sends nothing,
   * and best-effort: a failure is logged (ids and error class only, the address can be in
   * a mailer's message) and never reaches the mutation, whose write is already done.
   *
   * The app name is read here, not in the queued callback: in a scoped request the services
   * run on the request transaction, which is gone once the callback runs.
   */
  private async sendPreviousEmailNotice(params: {
    previousEmail: string;
    projectId: string;
    userId: string;
  }): Promise<void> {
    const { previousEmail, projectId, userId } = params;
    const logFailure = (error: unknown, what: string): void => {
      this.logger.warn(
        {
          projectId,
          userId,
          errorName: error instanceof Error ? error.name : typeof error,
          errorCode: (error as { code?: unknown } | null)?.code,
        },
        what
      );
    };

    const appName = await this.projects
      .getProjects({ ids: [projectId], limit: 1 })
      .then((page) => page.projects[0]?.name || undefined)
      .catch((error: unknown) => {
        logFailure(error, 'Could not read the project name for the previous-address notice');
        return undefined;
      });

    const send = async (): Promise<void> => {
      try {
        await this.email.sendProjectEmailChanged({
          to: previousEmail,
          ...(appName ? { appName } : {}),
        });
      } catch (error) {
        logFailure(
          error,
          'Failed to send the previous-address notice after an operator e-mail change'
        );
      }
    };

    if (this.scheduleAfterCommit) {
      this.scheduleAfterCommit(send, 'project-email-changed-notice');
    } else {
      await send();
    }
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

    const repositoryRequestedFields = stripHydratedFields<User>(requestedFields, userListHydrators);
    const usersResult = await this.users.getUsers({
      scope,
      ids,
      tagIds,
      page,
      limit,
      sort,
      search,
      requestedFields: repositoryRequestedFields,
      ...((params as { unbounded?: boolean }).unbounded ? { unbounded: true } : {}),
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
      const pageUserIds = usersResult.users.map((user) => user.id);
      const pivots =
        pageUserIds.length === 0
          ? []
          : await this.projectUsers.getProjectUsers({ projectId, userIds: pageUserIds });
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

  private isProjectTenant(tenant: Tenant): boolean {
    return tenant === Tenant.OrganizationProject || tenant === Tenant.AccountProject;
  }

  private assertProjectScope(scope: Scope, subject: string): void {
    if (!this.isProjectTenant(scope.tenant)) {
      throw new ValidationError(`${subject} can only be set in a project scope`);
    }
  }

  private assertProjectScopeForEmail(scope: Scope): void {
    this.assertProjectScope(scope, 'Email');
  }

  private async assertSetEmailAuthorized(actorUserId: string | undefined): Promise<void> {
    if (!actorUserId) {
      throw new AuthenticationError('Authentication required');
    }
    const result = await this.auth.isAuthorized(
      {
        permission: { resource: ResourceSlug.ProjectUser, action: ResourceAction.SetEmail },
        context: {},
      },
      actorUserId
    );
    if (!result.authorized) {
      throw new AuthorizationError('Forbidden', result.reason ?? undefined);
    }
  }

  public async createUser(
    params: MutationCreateUserArgs & { actorUserId?: string }
  ): Promise<User> {
    const { input, actorUserId } = params;
    const rawEmail = input.email;
    const hasEmail = rawEmail !== undefined && rawEmail !== null;
    let normalizedEmail: string | undefined;
    if (hasEmail) {
      this.assertProjectScopeForEmail(input.scope);
      normalizedEmail = this.userAuthenticationMethods.normalizeOperatorEmail(rawEmail);
      await this.assertSetEmailAuthorized(actorUserId);
    }

    return await this.db.withTransaction(async (tx: Transaction) => {
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

      if (normalizedEmail) {
        const projectId = this.extractProjectIdFromScope(scope);
        const { operation } = await this.userAuthenticationMethods.setOrReplaceEmailMethod(
          { userId, email: normalizedEmail, operation: 'operator-create-user' },
          tx
        );
        if (operation) {
          await this.projectUsers.publishProjectUserEmailChanged(
            { projectId, userId, operation },
            tx
          );
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
        await this.invalidatePermissionsCacheForAllScopes(scope);
      }

      await this.addUserIdToScopeCache(scope, userId);

      if (invalidatePivotAuth) {
        await this.invalidateAuthorizationResultsForUser(userId);
      }

      return user;
    });
  }

  public async setProjectUserEmail(params: MutationSetProjectUserEmailArgs): Promise<User> {
    const { userId, email, scope } = params.input;
    this.assertProjectScopeForEmail(scope);
    const normalizedEmail = this.userAuthenticationMethods.normalizeOperatorEmail(email);
    const projectId = this.extractProjectIdFromScope(scope);

    const { user, previousEmail } = await this.db.withTransaction(async (tx: Transaction) => {
      const members = await this.projectUsers.getProjectUsers({ projectId, userId }, tx);
      if (members.length === 0) {
        throw new NotFoundError('User');
      }

      const { operation, previousEmail } =
        await this.userAuthenticationMethods.setOrReplaceEmailMethod(
          { userId, email: normalizedEmail, operation: 'operator-set-email' },
          tx
        );
      if (operation) {
        await this.projectUsers.publishProjectUserEmailChanged(
          { projectId, userId, operation },
          tx
        );
      }

      const page = await this.users.getUsers({ ids: [userId], limit: 1 }, tx);
      const user = page.users[0];
      if (!user) {
        throw new NotFoundError('User');
      }
      return { user, previousEmail: operation === 'changed' ? previousEmail : undefined };
    });

    // After the transaction: a call that failed above never reaches this line.
    if (previousEmail) {
      await this.sendPreviousEmailNotice({ previousEmail, projectId, userId });
    }
    return user;
  }

  /**
   * Operator-set project password (`ProjectUser:SetPassword`, enforced by the transport).
   * The policy is checked first, before any transaction or write, and a refusal never
   * contains the value. The transport guard refuses an input scope that differs from the
   * authorized one (`lib/authorization/operation-scope.ts`).
   * One transaction: membership (never a create), the credential write
   * (`admin-set`: audit row, lockout reset and `project.user_password_set` come with it),
   * and revocation of the user's project-app grants as `completeReset` does. The Email
   * method is not marked verified (an operator proves nothing about the mailbox) and
   * platform sessions are not touched.
   */
  public async setProjectUserPassword(params: MutationSetProjectUserPasswordArgs): Promise<User> {
    const { userId, password, scope } = params.input;
    this.assertProjectScope(scope, 'Password');
    this.credentials.assertPasswordMeetsPolicy(password);

    return await this.db.withTransaction(async (tx: Transaction) => {
      const projectId = this.extractProjectIdFromScope(scope);
      const members = await this.projectUsers.getProjectUsers({ projectId, userId }, tx);
      if (members.length === 0) {
        throw new NotFoundError('User');
      }

      await this.credentials.setPassword(
        { scope: { scope: 'project', projectId }, userId, password, source: 'admin-set' },
        tx
      );
      await this.projectOAuthGrants.revokeAllForUserInProject(projectId, userId, tx);

      const page = await this.users.getUsers({ ids: [userId], limit: 1 }, tx);
      const user = page.users[0];
      if (!user) {
        throw new NotFoundError('User');
      }
      return user;
    });
  }

  /**
   * Audited export of project password hashes in CDM shape (`ProjectUser:ExportCredentials`,
   * enforced by the transport, which also refuses an input scope that differs from the
   * authorized one, see `lib/authorization/operation-scope.ts`). Shape first, before any
   * read: project scope, `kinds` (default `[PASSWORD]`, never empty), `userIds` non-empty,
   * UUIDs, at most one page. Then, in one transaction: **every** id must be a member (any
   * non-member is `NotFoundError` and nothing is read or audited: no partial export), the
   * hashes are read once, and the one audit row is written. A failed audit write rolls the
   * export back with it.
   */
  public async exportProjectUserCredentials(
    params: QueryExportProjectUserCredentialsArgs
  ): Promise<ProjectUserCredentialExport> {
    const { scope, userIds, kinds } = params.input;
    this.assertProjectScope(scope, 'Credential export');
    const exportKinds = this.normalizeExportKinds(kinds);
    const ids = this.normalizeExportUserIds(userIds);
    const projectId = this.extractProjectIdFromScope(scope);

    return await this.db.withTransaction(async (tx: Transaction) => {
      const members = await this.projectUsers.getProjectUsers({ projectId, userIds: ids }, tx);
      const memberIds = new Set(members.map((member) => member.userId));
      if (ids.some((id) => !memberIds.has(id))) {
        throw new NotFoundError('User');
      }
      return this.credentialExports.exportCredentials(
        { projectId, userIds: ids, kinds: exportKinds },
        tx
      );
    });
  }

  private normalizeExportKinds(kinds: CredentialKind[] | null | undefined): CredentialKind[] {
    if (kinds === undefined || kinds === null) {
      return [CredentialKind.Password];
    }
    if (kinds.length === 0) {
      throw new ValidationError('kinds must not be empty');
    }
    return [...new Set(kinds)];
  }

  /** Non-empty, within one page, UUIDs (lowercased, as stored), duplicates dropped in order. */
  private normalizeExportUserIds(userIds: string[]): string[] {
    const maxUserIds = config.system.maxPageSize;
    if (userIds.length === 0) {
      throw new ValidationError('userIds must not be empty');
    }
    if (userIds.length > maxUserIds) {
      throw new ValidationError(`userIds must not contain more than ${maxUserIds} ids`);
    }
    if (!userIds.every((id) => UUID_PATTERN.test(id))) {
      throw new ValidationError('userIds must be UUIDs');
    }
    return [...new Set(userIds.map((id) => id.toLowerCase()))];
  }

  /**
   * `User.passwordCredential`, resolved in the request's project scope: `null` for any
   * scope other than `OrganizationProject` / `AccountProject` (the leaf `*ProjectUser` tenants
   * included), `null` unless the caller holds `ProjectUser:ExportCredentials` in the request's
   * scope (a denial is `null`, never an error, so existing documents keep working),
   * and `null` when the member has no project credential. Otherwise
   * `{ source, updatedAt, fingerprint }`: the fingerprint is computed by the service from the
   * stored hash and is never the hash. One read per call (the field resolver runs per parent);
   * batch it when a root field returns lists of `User`.
   */
  public async getProjectUserPasswordCredential(params: {
    userId: string;
    scope: Scope;
    actorUserId: string | undefined;
  }): Promise<ProjectUserPasswordCredential | null> {
    const { userId, scope, actorUserId } = params;
    // The same predicate as `assertProjectScope`: the leaf tenants (`OrganizationProjectUser`,
    // `AccountProjectUser`) also embed a project id but are not project scopes here.
    if (!this.isProjectTenant(scope.tenant)) {
      return null;
    }
    const projectId = tryProjectIdFromScope(scope);
    if (!projectId) {
      return null;
    }
    if (!actorUserId) {
      return null;
    }
    const result = await this.auth.isAuthorized(
      {
        permission: {
          resource: ResourceSlug.ProjectUser,
          action: ResourceAction.ExportCredentials,
        },
        context: {},
      },
      actorUserId
    );
    if (!result.authorized) {
      return null;
    }

    const [summary] = await this.db.withTransaction((tx: Transaction) =>
      this.credentialExports.getPasswordCredentialSummaries({ projectId, userIds: [userId] }, tx)
    );
    return summary
      ? { source: summary.source, updatedAt: summary.updatedAt, fingerprint: summary.fingerprint }
      : null;
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
          await this.invalidatePermissionsCacheForAllScopes(scope);
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
          await this.revokeProjectScopedAccess({ userId, projectId, scope }, tx);
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

  /**
   * Ends everything a member holds through a project before the membership itself goes.
   * Removing only the `project_users` row left the user's project roles, groups and
   * direct permissions active (the organization branch above already removes the roles)
   * and emitted a single `project.user_removed`. Each revoke goes through the pivot
   * service, so it publishes the same event a direct revoke does (`user.role_revoked`,
   * `user.group_revoked`, `user.permission_revoked`, with the user as subject), in this
   * transaction and before the project links can change.
   */
  private async revokeProjectScopedAccess(
    params: { userId: string; projectId: string; scope: Scope },
    tx: Transaction
  ): Promise<void> {
    const { userId, projectId, scope } = params;

    const [roleIds, projectUserGroups, projectUserPermissions] = await Promise.all([
      this.getUserRoleIdsInScope(userId, scope),
      this.projectUserGroups.getProjectUserGroups({ projectId, userId }, tx),
      this.projectUserPermissions.getProjectUserPermissions({ projectId, userId }, tx),
    ]);

    for (const roleId of roleIds) {
      await this.userRoles.removeUserRole({ userId, roleId }, tx);
    }

    for (const { groupId } of projectUserGroups) {
      try {
        await this.userGroups.removeUserGroup({ userId, groupId }, tx);
      } catch (error) {
        // The project row can outlive a membership that was already removed directly.
        if (!(error instanceof NotFoundError)) throw error;
      }
      await this.projectUserGroups.removeProjectUserGroup({ projectId, userId, groupId }, tx);
    }

    for (const { permissionId } of projectUserPermissions) {
      try {
        await this.userPermissions.revokeUserPermission({ userId, permissionId, scope }, tx);
      } catch (error) {
        if (!(error instanceof NotFoundError)) throw error;
      }
      await this.projectUserPermissions.removeProjectUserPermission(
        { projectId, userId, permissionId },
        tx
      );
    }

    if (roleIds.length > 0 || projectUserGroups.length > 0 || projectUserPermissions.length > 0) {
      await this.invalidatePermissionsCacheForAllScopes(scope);
    }
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
      await this.invalidatePermissionsCacheForAllScopes(params.scope);
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

      await this.invalidatePermissionsCacheForAllScopes(scope);
      return userPermission;
    });
  }

  /**
   * Where a user's picture lives. The same path `MeHandler` derives for that user's
   * own upload — an administrator setting someone's picture writes to exactly the
   * object that user would write themselves, which is the intent.
   */
  private userPicturePath(userId: string, filename: string): string {
    return this.fileStorage.sanitizeExtensionAndGeneratePath(filename, `users/${userId}/picture`);
  }

  /**
   * Everything that decides whether this caller may write this user's picture.
   *
   * **This is the tenancy boundary for the admin path, and it is the only one.**
   * Unlike the `me` mutations, the storage path here is derived from the *target*
   * `userId`, not from the caller — so nothing about the path constrains who may
   * write it, and these two checks are the whole of the protection. Extracted so
   * the base64 mutation, the mint and the confirmation cannot come to apply
   * different rules; a minted URL that skipped them would be a write capability for
   * an arbitrary user's picture.
   */
  private async assertMayWriteUserPicture(
    actorUserId: string,
    userId: string,
    scope: UploadUserPictureInput['scope']
  ): Promise<void> {
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
  }

  public async requestUserPictureUploadUrl(
    params: RequestUserPictureUploadUrlHandlerParams
  ): Promise<UploadUrl> {
    const { userId, filename, contentType, contentLength, scope, actorUserId } = params;

    await this.assertMayWriteUserPicture(actorUserId, userId, scope);
    this.fileStorage.validateUploadRequest({ contentType, filename, contentLength });

    const minted = await this.fileStorage.getUploadUrl(this.userPicturePath(userId, filename), {
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

  public async confirmUserPictureUpload(
    params: ConfirmUserPictureUploadHandlerParams
  ): Promise<{ url: string; path: string }> {
    const { userId, filename, scope, actorUserId } = params;

    // Re-run in full, not skipped because the mint already ran them: a permission
    // can be revoked while a URL is still live, and the write is what must not
    // happen. The mint check prevents handing out the capability; this one prevents
    // using it.
    await this.assertMayWriteUserPicture(actorUserId, userId, scope);

    const storagePath = this.userPicturePath(userId, filename);
    await this.fileStorage.assertStoredWithinPolicy(storagePath);

    return await this.db.withTransaction(async (tx: Transaction) => {
      const url = await this.fileStorage.getUrl(storagePath);

      if (isParentProjectScopeForPivotWrites(scope.tenant)) {
        const projectId = this.extractProjectIdFromScope(scope);
        await this.projectUsers.updateProjectUserProfile(
          { projectId, userId, picturePath: storagePath },
          tx
        );
        await this.invalidateAuthorizationResultsForUser(userId);
      } else {
        await this.users.updateUser(userId, { picturePath: storagePath }, tx);
      }

      return { url, path: storagePath };
    });
  }

  public async uploadUserPicture(
    params: UploadUserPictureHandlerParams
  ): Promise<{ url: string; path: string }> {
    const { userId, file, contentType, filename, scope, actorUserId } = params;

    await this.assertMayWriteUserPicture(actorUserId, userId, scope);

    const fileBuffer = this.fileStorage.validateAndDecodeUpload({
      file,
      contentType,
      filename,
    });

    const storagePath = this.userPicturePath(userId, filename);

    return await this.db.withTransaction(async (tx: Transaction) => {
      const result = await this.fileStorage.upload(fileBuffer, storagePath, {
        contentType,
        public: true,
      });

      if (isParentProjectScopeForPivotWrites(scope.tenant)) {
        const projectId = this.extractProjectIdFromScope(scope);
        await this.projectUsers.updateProjectUserProfile(
          { projectId, userId, picturePath: result.path },
          tx
        );
        await this.invalidateAuthorizationResultsForUser(userId);
      } else {
        await this.users.updateUser(userId, { picturePath: result.path }, tx);
      }

      return {
        url: result.url,
        path: result.path,
      };
    });
  }
}
