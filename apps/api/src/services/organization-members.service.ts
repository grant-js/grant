import { DbSchema } from '@logusgraphics/grant-database';
import {
  OrganizationMember,
  OrganizationMemberPage,
  QueryOrganizationMembersArgs,
  RemoveOrganizationMemberInput,
  UpdateOrganizationMemberInput,
} from '@logusgraphics/grant-schema';

import { NotFoundError } from '@/lib/errors';
import { Transaction } from '@/lib/transaction-manager.lib';
import { Repositories } from '@/repositories';
import { SelectedFields } from '@/services/common';
import { AuthenticatedUser } from '@/types';

import { AuditService, validateInput } from './common';
import {
  getOrganizationMembersParamsSchema,
  removeOrganizationMemberInputSchema,
  updateOrganizationMemberInputSchema,
} from './organization-members.schemas';

export class OrganizationMemberService extends AuditService {
  constructor(
    private readonly repositories: Repositories,
    user: AuthenticatedUser | null,
    db: DbSchema
  ) {
    super(null, '', user, db); // No audit logs for members query
  }

  public async getOrganizationMembers(
    params: QueryOrganizationMembersArgs & SelectedFields<OrganizationMember>,
    transaction?: Transaction
  ): Promise<OrganizationMemberPage> {
    const context = 'OrganizationMemberService.getOrganizationMembers';
    const validatedParams = validateInput(getOrganizationMembersParamsSchema, params, context);

    const result = await this.repositories.organizationMemberRepository.getOrganizationMembers(
      validatedParams,
      transaction
    );

    return result;
  }

  public async updateOrganizationMember(
    userId: string,
    organizationId: string,
    input: UpdateOrganizationMemberInput,
    transaction?: Transaction
  ): Promise<OrganizationMember> {
    const context = 'OrganizationMemberService.updateOrganizationMember';
    const validatedInput = validateInput(updateOrganizationMemberInputSchema, input, context);

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
    const roleBelongsToOrg = allOrganizationRoles.some((or) => or.roleId === validatedInput.roleId);
    if (!roleBelongsToOrg) {
      throw new NotFoundError('Role does not belong to this organization', 'errors:notFound.role', {
        roleId: validatedInput.roleId,
        organizationId,
      });
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
    await this.repositories.userRoleRepository.addUserRole(
      { userId, roleId: validatedInput.roleId },
      transaction
    );

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
    input: RemoveOrganizationMemberInput,
    transaction?: Transaction
  ): Promise<OrganizationMember> {
    const context = 'OrganizationMemberService.removeOrganizationMember';
    const validatedInput = validateInput(removeOrganizationMemberInputSchema, input, context);
    const { userId, organizationId } = validatedInput;

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
