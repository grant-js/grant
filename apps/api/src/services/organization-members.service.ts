import { canAssignRole } from '@grantjs/constants';
import {
  GrantAuth,
  type IAuditLogger,
  type IEventPublisher,
  type IOrganizationMemberRepository,
  type IOrganizationMemberService,
  type IOrganizationRoleRepository,
  type IOrganizationUserRepository,
  type IRoleRepository,
} from '@grantjs/core';
import {
  OrganizationMember,
  OrganizationMemberPage,
  QueryOrganizationMembersArgs,
  RemoveOrganizationMemberInput,
  Tenant,
  UpdateOrganizationMemberInput,
} from '@grantjs/schema';

import { AuthorizationError, BadRequestError, NotFoundError } from '@/lib/errors';
import { buildDelta } from '@/lib/events';
import { Transaction } from '@/lib/transaction-manager.lib';
import { SelectedFields } from '@/types';

import { validateInput } from './common';
import {
  getOrganizationMembersParamsSchema,
  removeOrganizationMemberInputSchema,
  updateOrganizationMemberInputSchema,
} from './organization-members.schemas';

export class OrganizationMemberService implements IOrganizationMemberService {
  constructor(
    private readonly organizationMemberRepository: IOrganizationMemberRepository,
    private readonly organizationUserRepository: IOrganizationUserRepository,
    private readonly organizationRoleRepository: IOrganizationRoleRepository,
    private readonly roleRepository: IRoleRepository,
    readonly user: GrantAuth | null,
    private readonly audit: IAuditLogger,
    private readonly events: IEventPublisher
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
    const { tenant } = scope;

    if (tenant !== Tenant.Organization) {
      throw new BadRequestError('Invalid tenant');
    }

    const result = await this.organizationMemberRepository.getOrganizationMembers(
      validatedParams,
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
