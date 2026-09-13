import {
  GrantAuth,
  type IAuditLogger,
  type IEventPublisher,
  type IFileStorageService,
  type IOrganizationRepository,
  type IOrganizationService,
  type IOrganizationUserRepository,
} from '@grantjs/core';
import {
  CreateOrganizationInput,
  MutationDeleteOrganizationArgs,
  MutationUpdateOrganizationArgs,
  Organization,
  OrganizationPage,
  QueryOrganizationsArgs,
  Tenant,
} from '@grantjs/schema';

import { BadRequestError, NotFoundError } from '@/lib/errors';
import { createLogger } from '@/lib/logger';
import {
  hydratePictureUrl,
  hydratePictureUrls,
  picturePathWhenSettingUrl,
} from '@/lib/picture-url.lib';
import { Transaction } from '@/lib/transaction-manager.lib';
import { DeleteParams, SelectedFields } from '@/types';

import {
  createDynamicPaginatedSchema,
  createDynamicSingleSchema,
  validateInput,
  validateOutput,
  validatePage,
} from './common';
import {
  createOrganizationInputSchema,
  deleteOrganizationParamsSchema,
  getOrganizationsParamsSchema,
  organizationSchema,
  setOrganizationPictureParamsSchema,
  updateOrganizationParamsSchema,
} from './organizations.schemas';

export class OrganizationService implements IOrganizationService {
  public logger = createLogger('OrganizationService');
  constructor(
    private readonly organizationRepository: IOrganizationRepository,
    private readonly organizationUserRepository: IOrganizationUserRepository,
    readonly user: GrantAuth | null,
    private readonly audit: IAuditLogger,
    private readonly events: IEventPublisher,
    private readonly fileStorage: IFileStorageService
  ) {}

  private async getOrganization(
    organizationId: string,
    transaction?: Transaction
  ): Promise<Organization> {
    const existingOrganizations = await this.organizationRepository.getOrganizations(
      {
        ids: [organizationId],
        limit: 1,
      },
      transaction
    );

    if (existingOrganizations.organizations.length === 0) {
      throw new NotFoundError('Organization');
    }

    return existingOrganizations.organizations[0];
  }

  private async validatedOrganization(
    organization: Organization,
    context: string
  ): Promise<Organization> {
    validateOutput(createDynamicSingleSchema(organizationSchema), organization, context);
    await hydratePictureUrl(this.fileStorage, organization);
    return organization;
  }

  public async getOrganizations(
    params: Omit<QueryOrganizationsArgs, 'scope'> & SelectedFields<Organization>,
    transaction?: Transaction
  ): Promise<OrganizationPage> {
    const context = 'OrganizationService.getOrganizations';
    validateInput(getOrganizationsParamsSchema, params, context);

    const userId = this.user?.userId;

    if (!userId) {
      throw new BadRequestError('User not found');
    }

    const userOrganizations = await this.organizationUserRepository.getUserOrganizationMemberships(
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

    const result = await this.organizationRepository.getOrganizations(
      { ...params, ids: organizationIds },
      transaction
    );

    validatePage(
      createDynamicPaginatedSchema(organizationSchema, params.requestedFields),
      result.organizations,
      result,
      context
    );

    await hydratePictureUrls(this.fileStorage, result.organizations);
    return result;
  }

  public async createOrganization(
    params: Omit<CreateOrganizationInput, 'scope'>,
    transaction?: Transaction
  ): Promise<Organization> {
    const context = 'OrganizationService.createOrganization';
    const validatedParams = validateInput(createOrganizationInputSchema, params, context);
    const { name } = validatedParams;

    const organization = await this.organizationRepository.createOrganization(
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

    await this.audit.logCreate(organization.id, newValues, metadata, transaction);

    return this.validatedOrganization(organization, context);
  }

  public async updateOrganization(
    params: MutationUpdateOrganizationArgs,
    transaction?: Transaction
  ): Promise<Organization> {
    const context = 'OrganizationService.updateOrganization';
    const validatedParams = validateInput(updateOrganizationParamsSchema, params, context);

    const { id, input } = validatedParams;

    const oldOrganization = await this.getOrganization(id, transaction);
    const updatedOrganization = await this.organizationRepository.updateOrganization(
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

    await this.audit.logUpdate(updatedOrganization.id, oldValues, newValues, metadata, transaction);

    if (
      oldOrganization.requireMfaForSensitiveActions !==
      updatedOrganization.requireMfaForSensitiveActions
    ) {
      await this.events.publish(
        {
          type: 'organization.mfa_enforcement_changed',
          scope: { tenant: Tenant.Organization, id: updatedOrganization.id },
          aggregate: { kind: 'organization', id: updatedOrganization.id },
          data: {
            after: {
              name: updatedOrganization.name,
              requireMfaForSensitiveActions: updatedOrganization.requireMfaForSensitiveActions,
            },
            delta: {
              requireMfaForSensitiveActions: {
                from: oldOrganization.requireMfaForSensitiveActions,
                to: updatedOrganization.requireMfaForSensitiveActions,
              },
            },
          },
        },
        transaction
      );
    }

    return this.validatedOrganization(updatedOrganization, context);
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
      ? await this.organizationRepository.hardDeleteOrganization(validatedParams, transaction)
      : await this.organizationRepository.softDeleteOrganization(validatedParams, transaction);

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
      await this.audit.logHardDelete(deletedOrganization.id, oldValues, metadata, transaction);
    } else {
      const newValues = {
        ...oldValues,
        deletedAt: deletedOrganization.deletedAt,
      };
      await this.audit.logSoftDelete(
        deletedOrganization.id,
        oldValues,
        newValues,
        metadata,
        transaction
      );
    }

    return this.validatedOrganization(deletedOrganization, context);
  }

  public async setOrganizationPicture(
    organizationId: string,
    input: { picturePath?: string | null; pictureUrl?: string | null },
    transaction?: Transaction
  ): Promise<Organization> {
    const context = 'OrganizationService.setOrganizationPicture';
    const validatedParams = validateInput(
      setOrganizationPictureParamsSchema,
      { organizationId, ...picturePathWhenSettingUrl(input) },
      context
    );

    const oldOrganization = await this.getOrganization(validatedParams.organizationId, transaction);
    const updatedOrganization = await this.organizationRepository.setOrganizationPicture(
      validatedParams.organizationId,
      {
        ...(validatedParams.pictureUrl !== undefined
          ? { pictureUrl: validatedParams.pictureUrl }
          : {}),
        ...(validatedParams.picturePath !== undefined
          ? { picturePath: validatedParams.picturePath }
          : {}),
      },
      transaction
    );

    await this.audit.logUpdate(
      updatedOrganization.id,
      {
        id: oldOrganization.id,
        pictureUrl: oldOrganization.pictureUrl ?? null,
      },
      {
        id: updatedOrganization.id,
        pictureUrl: updatedOrganization.pictureUrl ?? null,
      },
      { context },
      transaction
    );

    validateOutput(createDynamicSingleSchema(organizationSchema), updatedOrganization, context);
    await hydratePictureUrl(this.fileStorage, updatedOrganization);
    return updatedOrganization;
  }
}
