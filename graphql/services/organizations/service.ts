import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

import {
  QueryOrganizationsArgs,
  MutationCreateOrganizationArgs,
  MutationUpdateOrganizationArgs,
  MutationDeleteOrganizationArgs,
  Organization,
  OrganizationPage,
} from '@/graphql/generated/types';
import { Repositories } from '@/graphql/repositories';
import { organizationAuditLogs } from '@/graphql/repositories/organizations/schema';
import { AuthenticatedUser } from '@/graphql/types';

import {
  AuditService,
  validateInput,
  validateOutput,
  createDynamicPaginatedSchema,
  createDynamicSingleSchema,
} from '../common';

import { IOrganizationService } from './interface';
import {
  getOrganizationsParamsSchema,
  createOrganizationParamsSchema,
  updateOrganizationParamsSchema,
  deleteOrganizationParamsSchema,
  organizationSchema,
} from './schemas';

export class OrganizationService extends AuditService implements IOrganizationService {
  constructor(
    private readonly repositories: Repositories,
    user: AuthenticatedUser | null,
    private readonly db: PostgresJsDatabase
  ) {
    super(organizationAuditLogs, 'organizationId', user);
  }

  private async getOrganization(organizationId: string): Promise<Organization> {
    const existingOrganizations = await this.repositories.organizationRepository.getOrganizations({
      ids: [organizationId],
      limit: 1,
    });

    if (existingOrganizations.organizations.length === 0) {
      throw new Error('Organization not found');
    }

    return existingOrganizations.organizations[0];
  }

  public async getOrganizations(
    params: Omit<QueryOrganizationsArgs, 'scope'> & { requestedFields?: string[] }
  ): Promise<OrganizationPage> {
    const validatedParams = validateInput(
      getOrganizationsParamsSchema,
      params,
      'getOrganizations method'
    );
    const result = await this.repositories.organizationRepository.getOrganizations(
      validatedParams as any
    );

    // Transform repository result to standard format for validation
    const transformedResult = {
      items: result.organizations,
      totalCount: result.totalCount,
      hasNextPage: result.hasNextPage,
    };

    const validatedResult = validateOutput(
      createDynamicPaginatedSchema(organizationSchema, params.requestedFields),
      transformedResult,
      'getOrganizations method'
    ) as any;

    return {
      organizations: validatedResult.items,
      hasNextPage: validatedResult.hasNextPage,
      totalCount: validatedResult.totalCount,
    };
  }

  public async createOrganization(params: MutationCreateOrganizationArgs): Promise<Organization> {
    const validatedParams = validateInput(
      createOrganizationParamsSchema,
      params,
      'createOrganization method'
    );
    const organization =
      await this.repositories.organizationRepository.createOrganization(validatedParams);

    const newValues = {
      id: organization.id,
      name: organization.name,
      slug: organization.slug,
      createdAt: organization.createdAt,
      updatedAt: organization.updatedAt,
    };

    const metadata = {
      source: 'create_organization_mutation',
    };

    await this.logCreate(organization.id, newValues, metadata);

    return validateOutput(
      createDynamicSingleSchema(organizationSchema),
      organization,
      'createOrganization method'
    );
  }

  public async updateOrganization(params: MutationUpdateOrganizationArgs): Promise<Organization> {
    const validatedParams = validateInput(
      updateOrganizationParamsSchema,
      params,
      'updateOrganization method'
    );

    const oldOrganization = await this.getOrganization(validatedParams.id);
    const updatedOrganization =
      await this.repositories.organizationRepository.updateOrganization(validatedParams);

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
      source: 'update_organization_mutation',
    };

    await this.logUpdate(updatedOrganization.id, oldValues, newValues, metadata);

    return validateOutput(
      createDynamicSingleSchema(organizationSchema),
      updatedOrganization,
      'updateOrganization method'
    );
  }

  public async deleteOrganization(
    params: MutationDeleteOrganizationArgs & { hardDelete?: boolean }
  ): Promise<Organization> {
    const validatedParams = validateInput(
      deleteOrganizationParamsSchema,
      params,
      'deleteOrganization method'
    );

    const oldOrganization = await this.getOrganization(validatedParams.id);
    const isHardDelete = params.hardDelete === true;

    const deletedOrganization = isHardDelete
      ? await this.repositories.organizationRepository.hardDeleteOrganization(validatedParams)
      : await this.repositories.organizationRepository.softDeleteOrganization(validatedParams);

    const oldValues = {
      id: oldOrganization.id,
      name: oldOrganization.name,
      slug: oldOrganization.slug,
      createdAt: oldOrganization.createdAt,
      updatedAt: oldOrganization.updatedAt,
    };

    if (isHardDelete) {
      const metadata = {
        source: 'hard_delete_organization_mutation',
      };
      await this.logHardDelete(deletedOrganization.id, oldValues, metadata);
    } else {
      const newValues = {
        ...oldValues,
        deletedAt: deletedOrganization.deletedAt,
      };

      const metadata = {
        source: 'soft_delete_organization_mutation',
      };
      await this.logSoftDelete(deletedOrganization.id, oldValues, newValues, metadata);
    }

    return validateOutput(
      createDynamicSingleSchema(organizationSchema),
      deletedOrganization,
      'deleteOrganization method'
    );
  }
}
