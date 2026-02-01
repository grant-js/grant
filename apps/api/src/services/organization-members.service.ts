import { canAssignRole } from '@grantjs/constants';
import { GrantAuth } from '@grantjs/core';
import { DbSchema } from '@grantjs/database';
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
import { Repositories } from '@/repositories';
import { SelectedFields } from '@/services/common';

import { AuditService, validateInput } from './common';
import {
  getOrganizationMembersParamsSchema,
  removeOrganizationMemberInputSchema,
  updateOrganizationMemberInputSchema,
} from './organization-members.schemas';

export class OrganizationMemberService extends AuditService {
  constructor(
    private readonly repositories: Repositories,
    readonly user: GrantAuth | null,
    readonly db: DbSchema
  ) {
    super(null, '', user, db);
  }

  private getCurrentUserId(): string {
    if (!this.user?.userId) {
      throw new AuthorizationError('Authentication required', 'errors:auth.unauthorized');
    }
    return this.user.userId;
  }

  private async getUserRoleNameInOrganization(
    organizationId: string,
    userId: string,
    transaction?: Transaction
  ): Promise<string | null> {
    const member = await this.repositories.organizationMemberRepository.getOrganizationMember(
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
      throw new AuthorizationError(
        'Cannot modify your own membership',
        'errors:auth.cannotModifySelf'
      );
    }

    const currentUserRoleName = await this.getUserRoleNameInOrganization(
      organizationId,
      currentUserId,
      transaction
    );

    if (!currentUserRoleName) {
      throw new AuthorizationError(
        'You are not a member of this organization',
        'errors:auth.notOrganizationMember'
      );
    }

    const targetUserRoleName = await this.getUserRoleNameInOrganization(
      organizationId,
      targetUserId,
      transaction
    );

    if (!targetUserRoleName) {
      throw new AuthorizationError(
        'Target user is not a member of this organization',
        'errors:auth.targetNotOrganizationMember'
      );
    }

    if (!canAssignRole(currentUserRoleName, targetUserRoleName)) {
      throw new AuthorizationError(
        'Cannot manage members with equal or higher privilege',
        'errors:auth.insufficientPrivilege'
      );
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
      throw new BadRequestError('Invalid tenant', 'errors:badRequest.invalidTenant', {
        tenant,
      });
    }

    const result = await this.repositories.organizationMemberRepository.getOrganizationMembers(
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
    return await this.repositories.organizationMemberRepository.getOrganizationMember(
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
      throw new BadRequestError('Invalid tenant', 'errors:badRequest.invalidTenant', {
        tenant,
      });
    }

    const { currentUserRoleName } = await this.validateMemberManagementPermission(
      organizationId,
      userId,
      transaction
    );

    const organizationUsers =
      await this.repositories.organizationUserRepository.getOrganizationUsers(
        { organizationId, userId },
        transaction
      );
    if (organizationUsers.length === 0) {
      throw new NotFoundError('User is not a member of this organization', 'errors:notFound.user', {
        userId,
        organizationId,
      });
    }

    const allOrganizationRoles =
      await this.repositories.organizationRoleRepository.getOrganizationRoles(
        { organizationId },
        transaction
      );

    const newRoleAssignment = allOrganizationRoles.find((or) => or.roleId === roleId);
    if (!newRoleAssignment) {
      throw new NotFoundError('Role does not belong to this organization', 'errors:notFound.role', {
        roleId,
        organizationId,
      });
    }

    const newRole = await this.repositories.roleRepository.getRoles(
      { ids: [roleId], limit: 1 },
      transaction
    );
    if (newRole.roles.length === 0) {
      throw new NotFoundError('Role not found', 'errors:notFound.role', { roleId });
    }

    if (!canAssignRole(currentUserRoleName, newRole.roles[0].name)) {
      throw new AuthorizationError(
        'Cannot assign a role with equal or higher privilege than your own',
        'errors:auth.cannotAssignHigherRole'
      );
    }

    const userRoles = await this.repositories.userRoleRepository.getUserRoles(
      { userId },
      transaction
    );

    const orgRoleIds = new Set(allOrganizationRoles.map((or) => or.roleId));
    const orgScopedUserRoles = userRoles.filter((ur) => orgRoleIds.has(ur.roleId));

    for (const userRole of orgScopedUserRoles) {
      await this.repositories.userRoleRepository.softDeleteUserRole(
        { userId, roleId: userRole.roleId },
        transaction
      );
    }

    await this.repositories.userRoleRepository.addUserRole({ userId, roleId }, transaction);

    const updatedMember =
      await this.repositories.organizationMemberRepository.getOrganizationMember(
        {
          organizationId,
          userId,
        },
        transaction
      );

    if (!updatedMember) {
      throw new NotFoundError('Updated member not found', 'errors:notFound.user', {
        userId,
        organizationId,
      });
    }

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
      throw new BadRequestError('Invalid tenant', 'errors:badRequest.invalidTenant', {
        tenant,
      });
    }

    await this.validateMemberManagementPermission(organizationId, userId, transaction);

    const memberToRemove =
      await this.repositories.organizationMemberRepository.getOrganizationMember(
        {
          organizationId,
          userId,
        },
        transaction
      );

    if (!memberToRemove) {
      throw new NotFoundError('User is not a member of this organization', 'errors:notFound.user', {
        userId,
        organizationId,
      });
    }

    const organizationRoles =
      await this.repositories.organizationRoleRepository.getOrganizationRoles(
        { organizationId },
        transaction
      );
    const orgRoleIds = new Set(organizationRoles.map((or) => or.roleId));

    const userRoles = await this.repositories.userRoleRepository.getUserRoles(
      { userId },
      transaction
    );

    const orgScopedUserRoles = userRoles.filter((ur) => orgRoleIds.has(ur.roleId));
    for (const userRole of orgScopedUserRoles) {
      await this.repositories.userRoleRepository.softDeleteUserRole(
        { userId, roleId: userRole.roleId },
        transaction
      );
    }

    await this.repositories.organizationUserRepository.softDeleteOrganizationUser(
      { organizationId, userId },
      transaction
    );

    return memberToRemove;
  }
}
