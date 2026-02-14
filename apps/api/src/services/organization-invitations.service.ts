import { canAssignRole } from '@grantjs/constants';
import {
  GrantAuth,
  type IAuditLogger,
  type IOrganizationInvitationRepository,
  type IOrganizationInvitationService,
  type IOrganizationMemberRepository,
  type IOrganizationUserRepository,
  type IRoleRepository,
} from '@grantjs/core';
import {
  CreateOrganizationInvitationInput,
  GetInvitationQueryVariables,
  OrganizationInvitation,
  OrganizationInvitationPage,
  QueryOrganizationInvitationsArgs,
  UpdateOrganizationInvitationInput,
} from '@grantjs/schema';

import { AuthorizationError, NotFoundError } from '@/lib/errors';
import { Transaction } from '@/lib/transaction-manager.lib';
import { SelectedFields } from '@/types';

import {
  createDynamicPaginatedSchema,
  createDynamicSingleSchema,
  validateInput,
  validateOutput,
} from './common';
import {
  checkPendingInvitationParamsSchema,
  createInvitationParamsSchema,
  getInvitationByTokenParamsSchema,
  getInvitationsByOrganizationParamsSchema,
  organizationInvitationSchema,
  revokeInvitationParamsSchema,
  updateInvitationParamsSchema,
} from './organization-invitations.schemas';

export class OrganizationInvitationService implements IOrganizationInvitationService {
  constructor(
    private readonly organizationMemberRepository: IOrganizationMemberRepository,
    private readonly roleRepository: IRoleRepository,
    private readonly organizationInvitationRepository: IOrganizationInvitationRepository,
    private readonly organizationUserRepository: IOrganizationUserRepository,
    readonly user: GrantAuth | null,
    private readonly audit: IAuditLogger
  ) {}

  /**
   * Get the current user's ID from the auth context.
   * Throws if not authenticated.
   */
  private getCurrentUserId(): string {
    if (!this.user?.userId) {
      throw new AuthorizationError('Authentication required');
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
    const member = await this.organizationMemberRepository.getOrganizationMember(
      { organizationId, userId },
      transaction
    );
    return member?.role?.name ?? null;
  }

  /**
   * Validate that the current user can invite with the specified role.
   * Throws AuthorizationError if validation fails.
   */
  public async validateInvitationRolePermission(
    organizationId: string,
    roleId: string,
    transaction?: Transaction
  ): Promise<void> {
    const currentUserId = this.getCurrentUserId();

    // Get current user's role in the organization
    const currentUserRoleName = await this.getUserRoleNameInOrganization(
      organizationId,
      currentUserId,
      transaction
    );

    if (!currentUserRoleName) {
      throw new AuthorizationError('You are not a member of this organization');
    }

    // Get the role being assigned
    const targetRole = await this.roleRepository.getRoles({ ids: [roleId], limit: 1 }, transaction);

    if (targetRole.roles.length === 0) {
      throw new NotFoundError('Role', roleId);
    }

    // Guard: Cannot invite with a role of equal or higher privilege than own role
    if (!canAssignRole(currentUserRoleName, targetRole.roles[0].name)) {
      throw new AuthorizationError(
        'Cannot invite members with equal or higher privilege than your own role'
      );
    }
  }

  public async createInvitation(
    params: CreateOrganizationInvitationInput,
    transaction?: Transaction
  ): Promise<OrganizationInvitation> {
    const context = 'OrganizationInvitationService.createInvitation';
    const validatedParams = validateInput(createInvitationParamsSchema, params, context);

    const invitation = await this.organizationInvitationRepository.createInvitation(
      validatedParams,
      transaction
    );

    const newValues = {
      id: invitation.id,
      organizationId: invitation.organizationId,
      email: invitation.email,
      roleId: invitation.roleId,
      status: invitation.status,
      expiresAt: invitation.expiresAt,
      invitedBy: invitation.invitedBy,
      invitedAt: invitation.invitedAt,
      createdAt: invitation.createdAt,
      updatedAt: invitation.updatedAt,
    };

    const metadata = {
      context,
    };

    await this.audit.logCreate(invitation.id, newValues, metadata, transaction);

    return validateOutput(
      createDynamicSingleSchema(organizationInvitationSchema),
      invitation,
      context
    );
  }

  public async getInvitationByToken(
    params: GetInvitationQueryVariables & SelectedFields<OrganizationInvitation>,
    transaction?: Transaction
  ): Promise<OrganizationInvitation | null> {
    const context = 'OrganizationInvitationService.getInvitationByToken';
    validateInput(getInvitationByTokenParamsSchema, params, context);

    const invitation = await this.organizationInvitationRepository.getInvitationByToken(
      params,
      transaction
    );

    if (!invitation) {
      return null;
    }

    return validateOutput(
      createDynamicSingleSchema(organizationInvitationSchema),
      invitation,
      context
    );
  }

  public async getInvitationById(
    id: string,
    transaction?: Transaction
  ): Promise<OrganizationInvitation | null> {
    const invitation = await this.organizationInvitationRepository.getInvitationById(
      id,
      transaction
    );

    if (!invitation) {
      return null;
    }

    return invitation as OrganizationInvitation;
  }

  public async getInvitationsByOrganization(
    params: QueryOrganizationInvitationsArgs & SelectedFields<OrganizationInvitation>,
    transaction?: Transaction
  ): Promise<OrganizationInvitationPage> {
    const context = 'OrganizationInvitationService.getInvitationsByOrganization';
    const validatedParams = validateInput(
      getInvitationsByOrganizationParamsSchema,
      params,
      context
    );

    const result = await this.organizationInvitationRepository.getOrganizationInvitations(
      validatedParams,
      transaction
    );

    const transformedResult = {
      items: result.invitations,
      totalCount: result.totalCount,
      hasNextPage: result.hasNextPage,
    };

    validateOutput(
      createDynamicPaginatedSchema(organizationInvitationSchema, params.requestedFields),
      transformedResult,
      context
    );

    return result;
  }

  public async checkPendingInvitation(
    email: string,
    organizationId: string,
    transaction?: Transaction
  ): Promise<OrganizationInvitation | null> {
    const context = 'OrganizationInvitationService.checkPendingInvitation';
    const validatedParams = validateInput(
      checkPendingInvitationParamsSchema,
      { email, organizationId },
      context
    );

    const invitation = await this.organizationInvitationRepository.checkPendingInvitation(
      validatedParams.email,
      validatedParams.organizationId,
      transaction
    );

    if (!invitation) {
      return null;
    }

    return validateOutput(
      createDynamicSingleSchema(organizationInvitationSchema),
      invitation,
      context
    );
  }

  public async updateInvitation(
    id: string,
    input: UpdateOrganizationInvitationInput,
    transaction?: Transaction
  ): Promise<OrganizationInvitation> {
    const context = 'OrganizationInvitationService.updateInvitation';
    const validatedParams = validateInput(updateInvitationParamsSchema, { id, ...input }, context);

    const { id: invitationId, ...updateData } = validatedParams;

    // Get old values for audit
    const oldInvitation = await this.organizationInvitationRepository.getInvitationById(
      invitationId,
      transaction
    );

    if (!oldInvitation) {
      throw new NotFoundError('Invitation', invitationId);
    }

    const invitation = await this.organizationInvitationRepository.updateInvitation(
      invitationId,
      updateData,
      transaction
    );

    const oldValues = {
      id: oldInvitation.id,
      status: oldInvitation.status,
      acceptedAt: oldInvitation.acceptedAt,
      updatedAt: oldInvitation.updatedAt,
    };

    const newValues = {
      id: invitation.id,
      status: invitation.status,
      acceptedAt: invitation.acceptedAt,
      updatedAt: invitation.updatedAt,
    };

    const metadata = {
      context,
    };

    await this.audit.logUpdate(invitation.id, oldValues, newValues, metadata, transaction);

    return validateOutput(
      createDynamicSingleSchema(organizationInvitationSchema),
      invitation,
      context
    );
  }

  public async revokeInvitation(
    id: string,
    transaction?: Transaction
  ): Promise<OrganizationInvitation> {
    const context = 'OrganizationInvitationService.revokeInvitation';
    const validatedParams = validateInput(revokeInvitationParamsSchema, { id }, context);

    const invitation = await this.organizationInvitationRepository.softDeleteInvitation(
      validatedParams.id,
      transaction
    );

    const oldValues = {
      id: invitation.id,
      organizationId: invitation.organizationId,
      email: invitation.email,
      roleId: invitation.roleId,
      status: invitation.status,
      createdAt: invitation.createdAt,
      updatedAt: invitation.updatedAt,
    };

    const newValues = {
      ...oldValues,
      deletedAt: invitation.deletedAt,
    };

    const metadata = {
      context,
    };

    await this.audit.logSoftDelete(invitation.id, oldValues, newValues, metadata, transaction);

    return validateOutput(
      createDynamicSingleSchema(organizationInvitationSchema),
      invitation,
      context
    );
  }

  public async isUserInOrganization(
    organizationId: string,
    userId: string,
    transaction?: Transaction
  ): Promise<boolean> {
    const organizationUsers = await this.organizationUserRepository.getOrganizationUsers(
      {
        organizationId,
      },
      transaction
    );

    return organizationUsers.some((ou) => ou.userId === userId);
  }
}
