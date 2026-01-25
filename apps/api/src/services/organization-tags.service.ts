import { GrantAuth } from '@grantjs/core';
import { DbSchema } from '@grantjs/database';
import { organizationTagAuditLogs } from '@grantjs/database';
import {
  OrganizationTag,
  AddOrganizationTagInput,
  RemoveOrganizationTagInput,
} from '@grantjs/schema';

import { ConflictError, NotFoundError } from '@/lib/errors';
import { Transaction } from '@/lib/transaction-manager.lib';
import { Repositories } from '@/repositories';

import {
  AuditService,
  validateInput,
  validateOutput,
  createDynamicSingleSchema,
  DeleteParams,
} from './common';
import {
  getOrganizationTagsParamsSchema,
  organizationTagSchema,
  addOrganizationTagInputSchema,
  removeOrganizationTagInputSchema,
} from './organization-tags.schemas';

export class OrganizationTagService extends AuditService {
  constructor(
    private readonly repositories: Repositories,
    user: GrantAuth | null,
    db: DbSchema
  ) {
    super(organizationTagAuditLogs, 'organizationTagId', user, db);
  }

  private async organizationExists(
    organizationId: string,
    transaction?: Transaction
  ): Promise<void> {
    const organizations = await this.repositories.organizationRepository.getOrganizations(
      {
        ids: [organizationId],
        limit: 1,
      },
      transaction
    );

    if (organizations.organizations.length === 0) {
      throw new NotFoundError('Organization not found', 'errors:notFound.organization');
    }
  }

  private async tagExists(tagId: string, transaction?: Transaction): Promise<void> {
    const tags = await this.repositories.tagRepository.getTags(
      {
        ids: [tagId],
        limit: 1,
      },
      transaction
    );

    if (tags.tags.length === 0) {
      throw new NotFoundError('Tag not found', 'errors:notFound.tag');
    }
  }

  private async organizationHasTag(
    organizationId: string,
    tagId: string,
    transaction?: Transaction
  ): Promise<boolean> {
    await this.organizationExists(organizationId, transaction);
    await this.tagExists(tagId, transaction);
    const existingOrganizationTags =
      await this.repositories.organizationTagRepository.getOrganizationTags(
        {
          organizationId,
        },
        transaction
      );

    return existingOrganizationTags.some((ot) => ot.tagId === tagId);
  }

  public async getOrganizationTags(
    params: { organizationId: string },
    transaction?: Transaction
  ): Promise<OrganizationTag[]> {
    const context = 'OrganizationTagService.getOrganizationTags';
    const validatedParams = validateInput(getOrganizationTagsParamsSchema, params, context);

    await this.organizationExists(validatedParams.organizationId, transaction);

    const result = await this.repositories.organizationTagRepository.getOrganizationTags(
      validatedParams,
      transaction
    );
    return validateOutput(
      createDynamicSingleSchema(organizationTagSchema).array(),
      result,
      context
    );
  }

  public async addOrganizationTag(
    params: AddOrganizationTagInput,
    transaction?: Transaction
  ): Promise<OrganizationTag> {
    const context = 'OrganizationTagService.addOrganizationTag';
    const validatedParams = validateInput(addOrganizationTagInputSchema, params, context);
    const { organizationId, tagId } = validatedParams;

    const hasTag = await this.organizationHasTag(organizationId, tagId, transaction);

    if (hasTag) {
      throw new ConflictError(
        'Organization already has this tag',
        'errors:conflict.duplicateEntry',
        { resource: 'OrganizationTag', field: 'tagId' }
      );
    }

    const organizationTag = await this.repositories.organizationTagRepository.addOrganizationTag(
      { organizationId, tagId },
      transaction
    );

    const newValues = {
      id: organizationTag.id,
      organizationId: organizationTag.organizationId,
      tagId: organizationTag.tagId,
      createdAt: organizationTag.createdAt,
      updatedAt: organizationTag.updatedAt,
    };

    const metadata = {
      context,
    };

    await this.logCreate(organizationTag.id, newValues, metadata, transaction);

    return validateOutput(
      createDynamicSingleSchema(organizationTagSchema),
      organizationTag,
      context
    );
  }

  public async removeOrganizationTag(
    params: RemoveOrganizationTagInput & DeleteParams,
    transaction?: Transaction
  ): Promise<OrganizationTag> {
    const context = 'OrganizationTagService.removeOrganizationTag';
    const validatedParams = validateInput(removeOrganizationTagInputSchema, params, context);

    const { organizationId, tagId, hardDelete } = validatedParams;

    const hasTag = await this.organizationHasTag(organizationId, tagId, transaction);

    if (!hasTag) {
      throw new NotFoundError('Organization does not have this tag', 'errors:notFound.tag');
    }

    const isHardDelete = hardDelete === true;

    const organizationTag = isHardDelete
      ? await this.repositories.organizationTagRepository.hardDeleteOrganizationTag(
          { organizationId, tagId },
          transaction
        )
      : await this.repositories.organizationTagRepository.softDeleteOrganizationTag(
          { organizationId, tagId },
          transaction
        );

    const oldValues = {
      id: organizationTag.id,
      organizationId: organizationTag.organizationId,
      tagId: organizationTag.tagId,
      createdAt: organizationTag.createdAt,
      updatedAt: organizationTag.updatedAt,
    };

    const metadata = {
      context,
      hardDelete,
    };

    if (isHardDelete) {
      await this.logHardDelete(organizationTag.id, oldValues, metadata, transaction);
    } else {
      const newValues = {
        ...oldValues,
        deletedAt: organizationTag.deletedAt,
      };
      await this.logSoftDelete(organizationTag.id, oldValues, newValues, metadata, transaction);
    }

    return validateOutput(
      createDynamicSingleSchema(organizationTagSchema),
      organizationTag,
      context
    );
  }
}
