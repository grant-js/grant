import {
  OrganizationInvitationModel,
  organizationInvitations,
  organizations,
  roles,
  users,
} from '@logusgraphics/grant-database';
import {
  GetInvitationQueryVariables,
  OrganizationInvitation,
  OrganizationInvitationPage,
  OrganizationInvitationSearchableField,
  QueryOrganizationInvitationsArgs,
} from '@logusgraphics/grant-schema';
import { and, eq, isNull } from 'drizzle-orm';

import { NotFoundError } from '@/lib/errors';
import { createModuleLogger } from '@/lib/logger';
import { Transaction } from '@/lib/transaction-manager.lib';
import { EntityRepository, FilterCondition, RelationsConfig } from '@/repositories/common';
import { SelectedFields } from '@/services/common';

// Internal repository types (not exposed via GraphQL)
export interface CreateOrganizationInvitationInput {
  organizationId: string;
  email: string;
  roleId: string;
  token: string;
  expiresAt: Date;
  invitedBy: string;
  status?: string;
}

export interface UpdateOrganizationInvitationInput {
  status?: string;
  acceptedAt?: Date;
}

export class OrganizationInvitationRepository extends EntityRepository<
  OrganizationInvitationModel,
  OrganizationInvitation
> {
  protected table = organizationInvitations;
  protected schemaName = 'organizationInvitations' as const;
  protected searchFields: Array<keyof OrganizationInvitationModel> = Object.values(
    OrganizationInvitationSearchableField
  ) as Array<keyof OrganizationInvitationModel>;
  protected defaultSortField: keyof OrganizationInvitationModel = 'createdAt';
  protected relations: RelationsConfig<OrganizationInvitation> = {
    organization: {
      field: 'organization',
      table: organizations,
      extract: (v) => v,
    },
    role: {
      field: 'role',
      table: roles,
      extract: (v) => v,
    },
    inviter: {
      field: 'inviter',
      table: users,
      extract: (v) => v,
    },
  };
  protected logger = createModuleLogger('OrganizationInvitationRepository');

  public async createInvitation(
    params: CreateOrganizationInvitationInput,
    transaction?: Transaction
  ): Promise<OrganizationInvitation> {
    return this.create(
      {
        organizationId: params.organizationId,
        email: params.email,
        roleId: params.roleId,
        token: params.token,
        expiresAt: params.expiresAt,
        invitedBy: params.invitedBy,
        status: params.status || 'pending',
      },
      transaction
    );
  }

  public async getInvitationById(
    id: string,
    transaction?: Transaction
  ): Promise<OrganizationInvitation | null> {
    const result = await this.query({ ids: [id], limit: 1 }, transaction);
    return result.items[0] || null;
  }

  public async getInvitationByToken(
    params: GetInvitationQueryVariables & SelectedFields<OrganizationInvitation>,
    transaction?: Transaction
  ): Promise<OrganizationInvitation | null> {
    const { token, requestedFields } = params;

    const filters: FilterCondition<OrganizationInvitationModel>[] = [
      {
        field: 'token',
        operator: 'eq',
        value: token,
      },
    ];

    this.logger.info({
      msg: 'getInvitationByToken',
      token,
      requestedFields,
    });

    const result = await this.query(
      {
        filters,
        limit: 1,
        requestedFields,
      },
      transaction
    );

    this.logger.info({
      msg: 'getInvitationByToken result',
      result,
      requestedFields,
    });

    return result.items[0] || null;
  }

  public async getOrganizationInvitations(
    params: QueryOrganizationInvitationsArgs,
    transaction?: Transaction
  ): Promise<OrganizationInvitationPage> {
    const filters: FilterCondition<OrganizationInvitationModel>[] = [
      {
        field: 'organizationId',
        operator: 'eq',
        value: params.organizationId,
      },
    ];

    if (params.status) {
      filters.push({
        field: 'status',
        operator: 'eq',
        value: params.status,
      });
    }

    const result = await this.query(
      {
        ids: params.ids,
        search: params.search,
        page: params.page,
        limit: params.limit,
        sort: params.sort,
        filters,
      },
      transaction
    );

    return {
      invitations: result.items,
      totalCount: result.totalCount,
      hasNextPage: result.hasNextPage,
    };
  }

  public async checkPendingInvitation(
    email: string,
    organizationId: string,
    transaction?: Transaction
  ): Promise<OrganizationInvitation | null> {
    const filters: FilterCondition<OrganizationInvitationModel>[] = [
      {
        field: 'email',
        operator: 'eq',
        value: email,
      },
      {
        field: 'organizationId',
        operator: 'eq',
        value: organizationId,
      },
      {
        field: 'status',
        operator: 'eq',
        value: 'pending',
      },
    ];

    const result = await this.query(
      {
        filters,
        limit: 1,
      },
      transaction
    );

    return result.items[0] || null;
  }

  public async updateInvitation(
    id: string,
    input: UpdateOrganizationInvitationInput,
    transaction?: Transaction
  ): Promise<OrganizationInvitation> {
    const dbInstance = transaction ?? this.db;

    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (input.status !== undefined) {
      updateData.status = input.status;
    }

    if (input.acceptedAt !== undefined) {
      updateData.acceptedAt = input.acceptedAt;
    }

    const [updated] = await dbInstance
      .update(organizationInvitations)
      .set(updateData)
      .where(and(eq(organizationInvitations.id, id), isNull(organizationInvitations.deletedAt)))
      .returning();

    if (!updated) {
      throw new NotFoundError(`Invitation with id ${id} not found`, 'errors:notFound.invitation', {
        id,
      });
    }

    return updated as unknown as OrganizationInvitation;
  }

  public async softDeleteInvitation(
    id: string,
    transaction?: Transaction
  ): Promise<OrganizationInvitation> {
    return this.softDelete({ id }, transaction);
  }
}
