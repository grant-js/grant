import { canAssignRole, ORGANIZATION_ROLE_DEFINITIONS, RoleKey } from '@grantjs/constants';
import {
  GrantAuth,
  type IAuditLogger,
  type IEventPublisher,
  type IFileStorageService,
  type IOrganizationMemberRepository,
  type IOrganizationMemberService,
  type IOrganizationProjectRepository,
  type IOrganizationRepository,
  type IOrganizationRoleRepository,
  type IOrganizationUserRepository,
  type IRoleRepository,
  type IUserAuthenticationMethodRepository,
} from '@grantjs/core';
import {
  OrganizationMember,
  OrganizationMemberPage,
  OrganizationOwnershipTransfer,
  QueryOrganizationMembersArgs,
  RemoveOrganizationMemberInput,
  Tenant,
  TokenType,
  TransferOrganizationOwnershipInput,
  UpdateOrganizationMemberInput,
} from '@grantjs/schema';

import { AuthorizationError, BadRequestError, ConflictError, NotFoundError } from '@/lib/errors';
import { buildDelta } from '@/lib/events';
import { hydratePictureUrl } from '@/lib/picture-url.lib';
import { organizationProjectFromScopeOrThrow } from '@/lib/scope.lib';
import { Transaction } from '@/lib/transaction-manager.lib';
import { SelectedFields } from '@/types';

import { validateInput } from './common';
import {
  getOrganizationMembersParamsSchema,
  removeOrganizationMemberInputSchema,
  transferOrganizationOwnershipInputSchema,
  updateOrganizationMemberInputSchema,
} from './organization-members.schemas';

/** Stable `reason` codes of the ownership-transfer rules (see docs/core-concepts/organization-ownership.md). */
export const OWNERSHIP_TRANSFER_REASON = {
  NotOwner: 'OWNERSHIP_TRANSFER_NOT_OWNER',
  SessionRequired: 'OWNERSHIP_TRANSFER_SESSION_REQUIRED',
  Self: 'OWNERSHIP_TRANSFER_SELF',
  InvalidSelection: 'OWNERSHIP_TRANSFER_INVALID_SELECTION',
  InvalidRole: 'OWNERSHIP_TRANSFER_INVALID_ROLE',
  TargetNotMember: 'OWNERSHIP_TRANSFER_TARGET_NOT_MEMBER',
  TargetDeactivated: 'OWNERSHIP_TRANSFER_TARGET_DEACTIVATED',
  TargetUnverified: 'OWNERSHIP_TRANSFER_TARGET_UNVERIFIED',
} as const;

export class OrganizationMemberService implements IOrganizationMemberService {
  constructor(
    private readonly organizationMemberRepository: IOrganizationMemberRepository,
    private readonly organizationUserRepository: IOrganizationUserRepository,
    private readonly organizationRoleRepository: IOrganizationRoleRepository,
    private readonly roleRepository: IRoleRepository,
    readonly user: GrantAuth | null,
    private readonly audit: IAuditLogger,
    private readonly events: IEventPublisher,
    private readonly organizationProjectRepository: IOrganizationProjectRepository,
    private readonly organizationRepository: IOrganizationRepository,
    private readonly userAuthenticationMethodRepository: IUserAuthenticationMethodRepository,
    private readonly fileStorage: IFileStorageService
  ) {}

  private getCurrentUserId(): string {
    if (!this.user?.userId) {
      throw new AuthorizationError('Authentication required');
    }
    return this.user.userId;
  }

  private async getUserRoleNameInOrganization(
    organizationId: string,
    userId: string,
    transaction?: Transaction
  ): Promise<string | null> {
    const member = await this.organizationMemberRepository.getOrganizationMember(
      { organizationId, userId },
      transaction
    );
    return member?.role?.name ?? null;
  }

  private async validateMemberManagementPermission(
    organizationId: string,
    targetUserId: string,
    transaction?: Transaction
  ): Promise<{ currentUserId: string; currentUserRoleName: string; targetUserRoleName: string }> {
    const currentUserId = this.getCurrentUserId();

    if (currentUserId === targetUserId) {
      throw new AuthorizationError('Cannot modify your own membership');
    }

    const currentUserRoleName = await this.getUserRoleNameInOrganization(
      organizationId,
      currentUserId,
      transaction
    );

    if (!currentUserRoleName) {
      throw new AuthorizationError('You are not a member of this organization');
    }

    const targetUserRoleName = await this.getUserRoleNameInOrganization(
      organizationId,
      targetUserId,
      transaction
    );

    if (!targetUserRoleName) {
      throw new AuthorizationError('Target user is not a member of this organization');
    }

    if (!canAssignRole(currentUserRoleName, targetUserRoleName)) {
      throw new AuthorizationError('Cannot manage members with equal or higher privilege');
    }

    return { currentUserId, currentUserRoleName, targetUserRoleName };
  }

  public async getOrganizationMembers(
    params: QueryOrganizationMembersArgs & SelectedFields<OrganizationMember>,
    transaction?: Transaction
  ): Promise<OrganizationMemberPage> {
    const context = 'OrganizationMemberService.getOrganizationMembers';
    const validatedParams = validateInput(getOrganizationMembersParamsSchema, params, context);

    const { scope } = validatedParams;

    // Organization scope: the dashboard path, unchanged.
    // OrganizationProject scope: read-only access for a project key (or a session in a project
    // scope). The organization is derived from the composite id and the project must belong to it.
    // Member mutations never come through here and stay organization-scope only.
    let organizationId: string;
    if (scope.tenant === Tenant.Organization) {
      organizationId = scope.id;
    } else if (scope.tenant === Tenant.OrganizationProject) {
      const derived = organizationProjectFromScopeOrThrow(scope);
      const links = await this.organizationProjectRepository.getOrganizationProjects(
        { organizationId: derived.organizationId, projectId: derived.projectId },
        transaction
      );
      if (links.length === 0) {
        throw new AuthorizationError('Forbidden');
      }
      organizationId = derived.organizationId;
    } else {
      throw new BadRequestError('Invalid tenant');
    }

    const result = await this.organizationMemberRepository.getOrganizationMembers(
      { ...validatedParams, scope: { tenant: Tenant.Organization, id: organizationId } },
      transaction
    );

    return result;
  }

  public async getOrganizationMember(
    organizationId: string,
    userId: string,
    transaction?: Transaction
  ): Promise<OrganizationMember | null> {
    return await this.organizationMemberRepository.getOrganizationMember(
      { organizationId, userId },
      transaction
    );
  }

  public async updateOrganizationMember(
    userId: string,
    input: UpdateOrganizationMemberInput,
    transaction?: Transaction
  ): Promise<OrganizationMember> {
    const context = 'OrganizationMemberService.updateOrganizationMember';
    const validatedInput = validateInput(updateOrganizationMemberInputSchema, input, context);
    const { scope, roleId } = validatedInput;
    const { id: organizationId, tenant } = scope;

    if (tenant !== Tenant.Organization) {
      throw new BadRequestError('Invalid tenant');
    }

    const { currentUserRoleName } = await this.validateMemberManagementPermission(
      organizationId,
      userId,
      transaction
    );

    const organizationUsers = await this.organizationUserRepository.getOrganizationUsers(
      { organizationId, userId },
      transaction
    );
    if (organizationUsers.length === 0) {
      throw new NotFoundError('User', userId);
    }

    const allOrganizationRoles = await this.organizationRoleRepository.getOrganizationRoles(
      { organizationId },
      transaction
    );

    const newRoleAssignment = allOrganizationRoles.find((or) => or.roleId === roleId);
    if (!newRoleAssignment) {
      throw new NotFoundError('Role', roleId);
    }

    const newRole = await this.roleRepository.getRoles({ ids: [roleId], limit: 1 }, transaction);
    if (newRole.roles.length === 0) {
      throw new NotFoundError('Role', roleId);
    }

    if (!canAssignRole(currentUserRoleName, newRole.roles[0].name)) {
      throw new AuthorizationError(
        'Cannot assign a role with equal or higher privilege than your own'
      );
    }

    const currentMember = await this.organizationMemberRepository.getOrganizationMember(
      { organizationId, userId },
      transaction
    );
    const previousRoleId = currentMember?.role?.id ?? null;

    await this.organizationUserRepository.updateOrganizationUser(
      { organizationId, userId, roleId },
      transaction
    );

    const updatedMember = await this.organizationMemberRepository.getOrganizationMember(
      {
        organizationId,
        userId,
      },
      transaction
    );

    if (!updatedMember) {
      throw new NotFoundError('User', userId);
    }

    const before = { userId, previousRoleId };
    const after = { userId, roleId };

    await this.audit.logUpdate(
      organizationId,
      before,
      after,
      { context: 'OrganizationMemberService.updateOrganizationMember' },
      transaction
    );

    await this.events.publish(
      {
        type: 'organization.member_role_changed',
        scope: { tenant: Tenant.Organization, id: organizationId },
        subjectUserId: userId,
        aggregate: { kind: 'organizationMember', id: `${organizationId}:${userId}` },
        data: { before, after, delta: buildDelta(before, after) },
      },
      transaction
    );

    return updatedMember;
  }

  /**
   * Moves the Organization Owner role to another member, in the caller's transaction.
   *
   * The caller must be a signed-in user (never an API key or app token) who holds Owner in the
   * organization right now: the check runs on the rows locked `FOR UPDATE`, so two concurrent
   * transfers serialize and the second one sees the first one's result. The new owner gets Owner
   * before the previous owner is demoted or removed, so the organization is never without one.
   * This is the only path that assigns or removes Owner (`canAssignRole` stays strict).
   */
  public async transferOwnership(
    input: TransferOrganizationOwnershipInput,
    transaction?: Transaction
  ): Promise<OrganizationOwnershipTransfer> {
    const context = 'OrganizationMemberService.transferOwnership';
    const validatedInput = validateInput(transferOrganizationOwnershipInputSchema, input, context);
    const { scope, newOwnerId, previousOwnerRoleId, leaveOrganization } = validatedInput;
    const { id: organizationId, tenant } = scope;

    if (tenant !== Tenant.Organization) {
      throw new BadRequestError('Invalid tenant');
    }

    const callerId = this.getCurrentUserId();
    if (this.user?.type !== TokenType.Session) {
      throw new AuthorizationError(
        'Ownership can only be transferred by a signed-in user',
        OWNERSHIP_TRANSFER_REASON.SessionRequired
      );
    }

    const leaves = leaveOrganization === true;
    if (leaves === Boolean(previousOwnerRoleId)) {
      throw new BadRequestError(
        'Choose exactly one of previousOwnerRoleId and leaveOrganization',
        undefined,
        OWNERSHIP_TRANSFER_REASON.InvalidSelection
      );
    }

    if (newOwnerId === callerId) {
      throw new BadRequestError(
        'The new owner must be a different member',
        undefined,
        OWNERSHIP_TRANSFER_REASON.Self
      );
    }

    // Lock first, decide second: every check below reads the state this transaction holds.
    const lockedMembers = await this.organizationUserRepository.lockMembersForUpdate(
      { organizationId, userIds: [callerId, newOwnerId] },
      transaction
    );

    const { ownerRoleId, roleLevelById } = await this.getOrganizationRoleLevels(
      organizationId,
      transaction
    );

    const callerMembership = lockedMembers.find((member) => member.userId === callerId);
    if (!callerMembership || callerMembership.roleId !== ownerRoleId) {
      throw new AuthorizationError(
        'Only the current owner can transfer ownership',
        OWNERSHIP_TRANSFER_REASON.NotOwner
      );
    }

    if (previousOwnerRoleId) {
      const level = roleLevelById.get(previousOwnerRoleId);
      const ownerLevel = roleLevelById.get(ownerRoleId);
      if (level === undefined || ownerLevel === undefined || level <= ownerLevel) {
        throw new BadRequestError(
          'The previous owner can only keep an organization role below Owner',
          undefined,
          OWNERSHIP_TRANSFER_REASON.InvalidRole
        );
      }
    }

    const targetMembership = lockedMembers.find((member) => member.userId === newOwnerId);
    if (!targetMembership) {
      throw new NotFoundError(
        'Member',
        newOwnerId,
        undefined,
        OWNERSHIP_TRANSFER_REASON.TargetNotMember
      );
    }
    if (targetMembership.userDeletedAt) {
      throw new ConflictError(
        'The new owner is deactivated',
        'Member',
        'newOwnerId',
        undefined,
        OWNERSHIP_TRANSFER_REASON.TargetDeactivated
      );
    }

    // Same source as the session's `isVerified` claim: the authentication method's `isVerified`.
    const targetMethods =
      await this.userAuthenticationMethodRepository.getUserAuthenticationMethods(
        { userId: newOwnerId },
        transaction
      );
    if (!targetMethods.some((method) => method.isVerified)) {
      throw new ConflictError(
        'The new owner has no verified email',
        'Member',
        'newOwnerId',
        undefined,
        OWNERSHIP_TRANSFER_REASON.TargetUnverified
      );
    }

    // New owner first: a failure here leaves the previous owner untouched.
    await this.organizationUserRepository.updateOrganizationUser(
      { organizationId, userId: newOwnerId, roleId: ownerRoleId },
      transaction
    );
    if (leaves) {
      await this.organizationUserRepository.softDeleteOrganizationUser(
        { organizationId, userId: callerId },
        transaction
      );
    } else {
      await this.organizationUserRepository.updateOrganizationUser(
        { organizationId, userId: callerId, roleId: previousOwnerRoleId as string },
        transaction
      );
    }

    const newOwner = await this.organizationMemberRepository.getOrganizationMember(
      { organizationId, userId: newOwnerId },
      transaction
    );
    if (!newOwner) {
      throw new NotFoundError('Member', newOwnerId);
    }
    const previousOwner = leaves
      ? null
      : await this.organizationMemberRepository.getOrganizationMember(
          { organizationId, userId: callerId },
          transaction
        );

    const organizations = await this.organizationRepository.getOrganizations(
      { ids: [organizationId], limit: 1 },
      transaction
    );
    const organization = organizations.organizations[0];
    if (!organization) {
      throw new NotFoundError('Organization', organizationId);
    }
    await hydratePictureUrl(this.fileStorage, organization);

    // User ids and role ids only: no names or emails reach the audit log or a webhook.
    const before = {
      previousOwnerUserId: callerId,
      previousOwnerRoleId: ownerRoleId,
      newOwnerUserId: newOwnerId,
      newOwnerRoleId: targetMembership.roleId,
    };
    const after = {
      previousOwnerUserId: callerId,
      previousOwnerRoleId: leaves ? null : (previousOwnerRoleId as string),
      newOwnerUserId: newOwnerId,
      newOwnerRoleId: ownerRoleId,
    };

    await this.audit.logUpdate(organizationId, before, after, { context }, transaction);

    await this.events.publish(
      {
        type: 'organization.ownership_transferred',
        scope: { tenant: Tenant.Organization, id: organizationId },
        subjectUserId: newOwnerId,
        aggregate: { kind: 'organization', id: organizationId },
        data: { before, after, delta: buildDelta(before, after) },
      },
      transaction
    );

    return { organization, newOwner, previousOwner };
  }

  /**
   * The organization's own role ids with their level (Owner 1 ... Viewer 4) and the Owner role id.
   * A role whose name is not one of the standard organization roles has no level.
   */
  private async getOrganizationRoleLevels(
    organizationId: string,
    transaction?: Transaction
  ): Promise<{ ownerRoleId: string; roleLevelById: Map<string, number> }> {
    const organizationRoles = await this.organizationRoleRepository.getOrganizationRoles(
      { organizationId },
      transaction
    );
    const roleIds = organizationRoles.map((organizationRole) => organizationRole.roleId);
    const { roles } =
      roleIds.length === 0
        ? { roles: [] }
        : await this.roleRepository.getRoles({ ids: roleIds, limit: roleIds.length }, transaction);

    const levelByName = new Map(
      Object.values(ORGANIZATION_ROLE_DEFINITIONS).map((definition) => [
        definition.name,
        definition.level,
      ])
    );
    const roleLevelById = new Map<string, number>();
    for (const role of roles) {
      const level = levelByName.get(role.name);
      if (level !== undefined) roleLevelById.set(role.id, level);
    }

    const ownerName = ORGANIZATION_ROLE_DEFINITIONS[RoleKey.OrganizationOwner].name;
    const ownerRoleId = roles.find((role) => role.name === ownerName)?.id;
    if (!ownerRoleId) {
      throw new NotFoundError('Role', ownerName);
    }
    return { ownerRoleId, roleLevelById };
  }

  public async removeOrganizationMember(
    userId: string,
    input: RemoveOrganizationMemberInput,
    transaction?: Transaction
  ): Promise<OrganizationMember> {
    const context = 'OrganizationMemberService.removeOrganizationMember';
    const validatedInput = validateInput(removeOrganizationMemberInputSchema, input, context);
    const { scope } = validatedInput;
    const { id: organizationId, tenant } = scope;

    if (tenant !== Tenant.Organization) {
      throw new BadRequestError('Invalid tenant');
    }

    await this.validateMemberManagementPermission(organizationId, userId, transaction);

    const memberToRemove = await this.organizationMemberRepository.getOrganizationMember(
      {
        organizationId,
        userId,
      },
      transaction
    );

    if (!memberToRemove) {
      throw new NotFoundError('User', userId);
    }

    // Role is stored on organization_users; soft-deleting the membership removes the user's org role
    await this.organizationUserRepository.softDeleteOrganizationUser(
      { organizationId, userId },
      transaction
    );

    const before = { userId, roleId: memberToRemove.role?.id ?? null };
    const after = { userId, removed: true };

    await this.audit.logSoftDelete(
      organizationId,
      before,
      after,
      { context: 'OrganizationMemberService.removeOrganizationMember' },
      transaction
    );

    await this.events.publish(
      {
        type: 'organization.member_removed',
        scope: { tenant: Tenant.Organization, id: organizationId },
        subjectUserId: userId,
        aggregate: { kind: 'organizationMember', id: `${organizationId}:${userId}` },
        data: { before },
      },
      transaction
    );

    return memberToRemove;
  }
}
