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
    user: GrantAuth | null,
    db: DbSchema
  ) {
    super(null, '', user, db); // No audit logs for members query
  }

  /**
   * Get the current user's ID from the auth context.
   * Throws if not authenticated.
   */
  private getCurrentUserId(): string {
    if (!this.user?.userId) {
      throw new AuthorizationError('Authentication required', 'errors:auth.unauthorized');
    }
    return this.user.userId;
  }

  /**
   * Get the role name for a user in an organization.
   * Returns null if the user is not a member of the organization.
   */
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

  /**
   * Validate that the current user can manage the target member.
   * Throws AuthorizationError if validation fails.
   */
  private async validateMemberManagementPermission(
    organizationId: string,
    targetUserId: string,
    transaction?: Transaction
  ): Promise<{ currentUserId: string; currentUserRoleName: string; targetUserRoleName: string }> {
    const currentUserId = this.getCurrentUserId();

    // Guard: Cannot modify self
    if (currentUserId === targetUserId) {
      throw new AuthorizationError(
        'Cannot modify your own membership',
        'errors:auth.cannotModifySelf'
      );
    }

    // Get current user's role in the organization
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

    // Get target user's role in the organization
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

    // Guard: Cannot manage users with same or higher privilege level
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

  /**
   * Get a single organization member by organization ID and user ID.
   * Returns null if the user is not a member of the organization.
   */
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

    // Validate permission to manage this member
    const { currentUserRoleName } = await this.validateMemberManagementPermission(
      organizationId,
      userId,
      transaction
    );

    // 1. Verify user is in organization
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

    // 2. Get ALL organization roles (needed to identify which user roles belong to this org)
    const allOrganizationRoles =
      await this.repositories.organizationRoleRepository.getOrganizationRoles(
        { organizationId },
        transaction
      );

    // Verify the new role belongs to organization
    const newRoleAssignment = allOrganizationRoles.find((or) => or.roleId === roleId);
    if (!newRoleAssignment) {
      throw new NotFoundError('Role does not belong to this organization', 'errors:notFound.role', {
        roleId,
        organizationId,
      });
    }

    // Get the new role's name to validate assignment permission
    const newRole = await this.repositories.roleRepository.getRoles(
      { ids: [roleId], limit: 1 },
      transaction
    );
    if (newRole.roles.length === 0) {
      throw new NotFoundError('Role not found', 'errors:notFound.role', { roleId });
    }

    // Guard: Cannot assign a role with equal or higher privilege than own role
    if (!canAssignRole(currentUserRoleName, newRole.roles[0].name)) {
      throw new AuthorizationError(
        'Cannot assign a role with equal or higher privilege than your own',
        'errors:auth.cannotAssignHigherRole'
      );
    }

    // 3. Get user's current roles
    const userRoles = await this.repositories.userRoleRepository.getUserRoles(
      { userId },
      transaction
    );

    // 4. Find organization-scoped roles (user roles that match organization roles)
    const orgRoleIds = new Set(allOrganizationRoles.map((or) => or.roleId));
    const orgScopedUserRoles = userRoles.filter((ur) => orgRoleIds.has(ur.roleId));

    // 5. Remove ALL old organization-scoped roles first
    // This ensures we don't have duplicates if the user somehow has multiple org roles
    for (const userRole of orgScopedUserRoles) {
      await this.repositories.userRoleRepository.softDeleteUserRole(
        { userId, roleId: userRole.roleId },
        transaction
      );
    }

    // 6. Add new role (addUserRole will reactivate if soft-deleted, or create if new)
    // This handles the case where we just deleted it, or if it's a completely new role
    await this.repositories.userRoleRepository.addUserRole({ userId, roleId }, transaction);

    // 7. Fetch updated member
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

    // Validate permission to manage this member
    await this.validateMemberManagementPermission(organizationId, userId, transaction);

    // 1. Fetch the member before removal (for return value)
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

    // 2. Get organization roles to identify which user roles to remove
    const organizationRoles =
      await this.repositories.organizationRoleRepository.getOrganizationRoles(
        { organizationId },
        transaction
      );
    const orgRoleIds = new Set(organizationRoles.map((or) => or.roleId));

    // 3. Get user's roles
    const userRoles = await this.repositories.userRoleRepository.getUserRoles(
      { userId },
      transaction
    );

    // 4. Remove all organization-scoped user roles
    const orgScopedUserRoles = userRoles.filter((ur) => orgRoleIds.has(ur.roleId));
    for (const userRole of orgScopedUserRoles) {
      await this.repositories.userRoleRepository.softDeleteUserRole(
        { userId, roleId: userRole.roleId },
        transaction
      );
    }

    // 5. Remove organization-user relationship
    await this.repositories.organizationUserRepository.softDeleteOrganizationUser(
      { organizationId, userId },
      transaction
    );

    return memberToRemove;
  }
}
