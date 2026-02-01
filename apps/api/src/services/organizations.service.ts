import { GrantAuth } from '@grantjs/core';
import { DbSchema, organizationAuditLogs } from '@grantjs/database';
import {
  CreateOrganizationInput,
  MutationDeleteOrganizationArgs,
  MutationUpdateOrganizationArgs,
  Organization,
  OrganizationPage,
  QueryOrganizationsArgs,
} from '@grantjs/schema';

import { BadRequestError, NotFoundError } from '@/lib/errors';
import { createModuleLogger } from '@/lib/logger';
import { Transaction } from '@/lib/transaction-manager.lib';
import { Repositories } from '@/repositories';

import {
  AuditService,
  DeleteParams,
  SelectedFields,
  createDynamicPaginatedSchema,
  createDynamicSingleSchema,
  validateInput,
  validateOutput,
} from './common';
import {
  createOrganizationInputSchema,
  deleteOrganizationParamsSchema,
  getOrganizationsParamsSchema,
  organizationSchema,
  updateOrganizationParamsSchema,
} from './organizations.schemas';

export class OrganizationService extends AuditService {
  public logger = createModuleLogger('OrganizationService');
  constructor(
    private readonly repositories: Repositories,
    readonly user: GrantAuth | null,
    readonly db: DbSchema
  ) {
    super(organizationAuditLogs, 'organizationId', user, db);
  }

  private async getOrganization(
    organizationId: string,
    transaction?: Transaction
  ): Promise<Organization> {
    const existingOrganizations = await this.repositories.organizationRepository.getOrganizations(
      {
        ids: [organizationId],
        limit: 1,
      },
      transaction
    );

    if (existingOrganizations.organizations.length === 0) {
      throw new NotFoundError('Organization not found', 'errors:notFound.organization');
    }

    return existingOrganizations.organizations[0];
  }

  public async getOrganizations(
    params: Omit<QueryOrganizationsArgs, 'scope'> & SelectedFields<Organization>,
    transaction?: Transaction
  ): Promise<OrganizationPage> {
    const context = 'OrganizationService.getOrganizations';
    validateInput(getOrganizationsParamsSchema, params, context);

    const userId = this.user?.userId;

    if (!userId) {
      throw new BadRequestError('User not found', 'errors:notFound.user');
    }

    const userOrganizations =
      await this.repositories.organizationUserRepository.getUserOrganizationMemberships(
        userId,
        transaction
      );

    if (userOrganizations.length === 0) {
      return {
        organizations: [],
        totalCount: 0,
        hasNextPage: false,
      };
    }

    const organizationIds = userOrganizations.map((organization) => organization.organizationId);

    const result = await this.repositories.organizationRepository.getOrganizations(
      { ...params, ids: organizationIds },
      transaction
    );

    const transformedResult = {
      items: result.organizations,
      totalCount: result.totalCount,
      hasNextPage: result.hasNextPage,
    };

    validateOutput(
      createDynamicPaginatedSchema(organizationSchema, params.requestedFields),
      transformedResult,
      context
    );

    return result;
  }

  public async createOrganization(
    params: Omit<CreateOrganizationInput, 'scope'>,
    transaction?: Transaction
  ): Promise<Organization> {
    const context = 'OrganizationService.createOrganization';
    const validatedParams = validateInput(createOrganizationInputSchema, params, context);
    const { name } = validatedParams;

    const organization = await this.repositories.organizationRepository.createOrganization(
      { name },
      transaction
    );

    const newValues = {
      id: organization.id,
      name: organization.name,
      slug: organization.slug,
      createdAt: organization.createdAt,
      updatedAt: organization.updatedAt,
    };

    const metadata = {
      context,
    };

    await this.logCreate(organization.id, newValues, metadata, transaction);

    return validateOutput(createDynamicSingleSchema(organizationSchema), organization, context);
  }

  public async updateOrganization(
    params: MutationUpdateOrganizationArgs,
    transaction?: Transaction
  ): Promise<Organization> {
    const context = 'OrganizationService.updateOrganization';
    const validatedParams = validateInput(updateOrganizationParamsSchema, params, context);

    const { id, input } = validatedParams;

    const oldOrganization = await this.getOrganization(id, transaction);
    const updatedOrganization = await this.repositories.organizationRepository.updateOrganization(
      { id, input },
      transaction
    );

    const oldValues = {
      id: oldOrganization.id,
      name: oldOrganization.name,
      slug: oldOrganization.slug,
      createdAt: oldOrganization.createdAt,
      updatedAt: oldOrganization.updatedAt,
    };

    const newValues = {
      id: updatedOrganization.id,
      name: updatedOrganization.name,
      slug: updatedOrganization.slug,
      createdAt: updatedOrganization.createdAt,
      updatedAt: updatedOrganization.updatedAt,
    };

    const metadata = {
      context,
    };

    await this.logUpdate(updatedOrganization.id, oldValues, newValues, metadata, transaction);

    return validateOutput(
      createDynamicSingleSchema(organizationSchema),
      updatedOrganization,
      context
    );
  }

  public async deleteOrganization(
    params: Omit<MutationDeleteOrganizationArgs, 'scope'> & DeleteParams,
    transaction?: Transaction
  ): Promise<Organization> {
    const context = 'OrganizationService.deleteOrganization';
    const validatedParams = validateInput(deleteOrganizationParamsSchema, params, context);

    const { id, hardDelete } = validatedParams;

    const oldOrganization = await this.getOrganization(id, transaction);
    const isHardDelete = hardDelete === true;

    const deletedOrganization = isHardDelete
      ? await this.repositories.organizationRepository.hardDeleteOrganization(
          validatedParams,
          transaction
        )
      : await this.repositories.organizationRepository.softDeleteOrganization(
          validatedParams,
          transaction
        );

    const oldValues = {
      id: oldOrganization.id,
      name: oldOrganization.name,
      slug: oldOrganization.slug,
      createdAt: oldOrganization.createdAt,
      updatedAt: oldOrganization.updatedAt,
    };

    const metadata = {
      context,
      hardDelete,
    };

    if (isHardDelete) {
      await this.logHardDelete(deletedOrganization.id, oldValues, metadata, transaction);
    } else {
      const newValues = {
        ...oldValues,
        deletedAt: deletedOrganization.deletedAt,
      };
      await this.logSoftDelete(deletedOrganization.id, oldValues, newValues, metadata, transaction);
    }

    return validateOutput(
      createDynamicSingleSchema(organizationSchema),
      deletedOrganization,
      context
    );
  }
}
