import { DbSchema, organizationInvitationsAuditLogs } from '@logusgraphics/grant-database';
import {
  GetInvitationQueryVariables,
  OrganizationInvitation,
  OrganizationInvitationPage,
  QueryOrganizationInvitationsArgs,
} from '@logusgraphics/grant-schema';

import { NotFoundError } from '@/lib/errors';
import { Transaction } from '@/lib/transaction-manager.lib';
import { Repositories } from '@/repositories';
import {
  CreateOrganizationInvitationInput,
  UpdateOrganizationInvitationInput,
} from '@/repositories/organization-invitations.repository';
import { AuthenticatedUser } from '@/types';

import {
  AuditService,
  SelectedFields,
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

export class OrganizationInvitationService extends AuditService {
  constructor(
    private readonly repositories: Repositories,
    user: AuthenticatedUser | null,
    db: DbSchema
  ) {
    super(organizationInvitationsAuditLogs, 'organizationInvitationId', user, db);
  }

  public async createInvitation(
    params: CreateOrganizationInvitationInput,
    transaction?: Transaction
  ): Promise<OrganizationInvitation> {
    const context = 'OrganizationInvitationService.createInvitation';
    const validatedParams = validateInput(createInvitationParamsSchema, params, context);

    const invitation = await this.repositories.organizationInvitationRepository.createInvitation(
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
      createdAt: invitation.createdAt,
      updatedAt: invitation.updatedAt,
    };

    const metadata = {
      context,
    };

    await this.logCreate(invitation.id, newValues, metadata, transaction);

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

    const invitation =
      await this.repositories.organizationInvitationRepository.getInvitationByToken(
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
    const invitation = await this.repositories.organizationInvitationRepository.getInvitationById(
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

    const result =
      await this.repositories.organizationInvitationRepository.getOrganizationInvitations(
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

    const invitation =
      await this.repositories.organizationInvitationRepository.checkPendingInvitation(
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
    const oldInvitation =
      await this.repositories.organizationInvitationRepository.getInvitationById(
        invitationId,
        transaction
      );

    if (!oldInvitation) {
      throw new NotFoundError(
        `Invitation with id ${invitationId} not found`,
        'errors:notFound.invitation',
        { id: invitationId }
      );
    }

    const invitation = await this.repositories.organizationInvitationRepository.updateInvitation(
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

    await this.logUpdate(invitation.id, oldValues, newValues, metadata, transaction);

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

    const invitation =
      await this.repositories.organizationInvitationRepository.softDeleteInvitation(
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

    await this.logSoftDelete(invitation.id, oldValues, newValues, metadata, transaction);

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
    const organizationUsers =
      await this.repositories.organizationUserRepository.getOrganizationUsers(
        {
          organizationId,
        },
        transaction
      );

    return organizationUsers.some((ou) => ou.userId === userId);
  }
}
