import { canAssignRole } from '@grantjs/constants';
import {
  GrantAuth,
  type IAuditLogger,
  type IOrganizationMemberRepository,
  type IOrganizationMemberService,
  type IOrganizationRoleRepository,
  type IOrganizationUserRepository,
  type IRoleRepository,
  type IUserRoleRepository,
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
    private readonly userRoleRepository: IUserRoleRepository,
    readonly user: GrantAuth | null,
    private readonly audit: IAuditLogger
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

    const userRoles = await this.userRoleRepository.getUserRoles({ userId }, transaction);

    const orgRoleIds = new Set(allOrganizationRoles.map((or) => or.roleId));
    const orgScopedUserRoles = userRoles.filter((ur) => orgRoleIds.has(ur.roleId));

    for (const userRole of orgScopedUserRoles) {
      await this.userRoleRepository.softDeleteUserRole(
        { userId, roleId: userRole.roleId },
        transaction
      );
    }

    await this.userRoleRepository.addUserRole({ userId, roleId }, transaction);

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

    await this.audit.logUpdate(
      organizationId,
      { userId, previousRoleIds: orgScopedUserRoles.map((ur) => ur.roleId) },
      { userId, roleId },
      { context: 'OrganizationMemberService.updateOrganizationMember' },
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

    const organizationRoles = await this.organizationRoleRepository.getOrganizationRoles(
      { organizationId },
      transaction
    );
    const orgRoleIds = new Set(organizationRoles.map((or) => or.roleId));

    const userRoles = await this.userRoleRepository.getUserRoles({ userId }, transaction);

    const orgScopedUserRoles = userRoles.filter((ur) => orgRoleIds.has(ur.roleId));
    for (const userRole of orgScopedUserRoles) {
      await this.userRoleRepository.softDeleteUserRole(
        { userId, roleId: userRole.roleId },
        transaction
      );
    }

    await this.organizationUserRepository.softDeleteOrganizationUser(
      { organizationId, userId },
      transaction
    );

    await this.audit.logSoftDelete(
      organizationId,
      { userId, roleIds: orgScopedUserRoles.map((ur) => ur.roleId) },
      { userId, removed: true },
      { context: 'OrganizationMemberService.removeOrganizationMember' },
      transaction
    );

    return memberToRemove;
  }
}
