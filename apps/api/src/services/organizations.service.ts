import { DbSchema, organizationAuditLogs } from '@logusgraphics/grant-database';
import {
  CreateOrganizationInput,
  MutationDeleteOrganizationArgs,
  MutationUpdateOrganizationArgs,
  Organization,
  OrganizationPage,
  QueryOrganizationsArgs,
} from '@logusgraphics/grant-schema';

import { NotFoundError } from '@/lib/errors';
import { Transaction } from '@/lib/transaction-manager.lib';
import { Repositories } from '@/repositories';
import { AuthenticatedUser } from '@/types';

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
  constructor(
    private readonly repositories: Repositories,
    user: AuthenticatedUser | null,
    db: DbSchema
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
    params: QueryOrganizationsArgs & SelectedFields<Organization>,
    transaction?: Transaction
  ): Promise<OrganizationPage> {
    const context = 'OrganizationService.getOrganizations';
    validateInput(getOrganizationsParamsSchema, params, context);
    const result = await this.repositories.organizationRepository.getOrganizations(
      params,
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
    params: CreateOrganizationInput,
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

    const oldOrganization = await this.getOrganization(id);
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
    params: MutationDeleteOrganizationArgs & DeleteParams,
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
