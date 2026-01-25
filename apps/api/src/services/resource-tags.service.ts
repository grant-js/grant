import { GrantAuth } from '@grantjs/core';
import { DbSchema, resourceTagAuditLogs } from '@grantjs/database';
import {
  AddResourceTagInput,
  RemoveResourceTagInput,
  ResourceTag,
  UpdateResourceTagInput,
} from '@grantjs/schema';

import { ConflictError, NotFoundError } from '@/lib/errors';
import { Transaction } from '@/lib/transaction-manager.lib';
import { Repositories } from '@/repositories';

import {
  AuditService,
  DeleteParams,
  createDynamicSingleSchema,
  validateInput,
  validateOutput,
} from './common';
import {
  addResourceTagInputSchema,
  getResourceTagIntersectionInputSchema,
  getResourceTagsParamsSchema,
  removeResourceTagInputSchema,
  removeResourceTagsInputSchema,
  resourceTagSchema,
  updateResourceTagInputSchema,
} from './resource-tags.schemas';

export class ResourceTagService extends AuditService {
  constructor(
    private readonly repositories: Repositories,
    user: GrantAuth | null,
    db: DbSchema
  ) {
    super(resourceTagAuditLogs, 'resourceTagId', user, db);
  }

  private async resourceExists(resourceId: string, transaction?: Transaction): Promise<void> {
    const resources = await this.repositories.resourceRepository.getResources(
      { ids: [resourceId], limit: 1 },
      transaction
    );

    if (resources.resources.length === 0) {
      throw new NotFoundError('Resource not found', 'errors:notFound.resource');
    }
  }

  private async tagExists(tagId: string, transaction?: Transaction): Promise<void> {
    const tags = await this.repositories.tagRepository.getTags(
      { ids: [tagId], limit: 1 },
      transaction
    );

    if (tags.tags.length === 0) {
      throw new NotFoundError('Tag not found', 'errors:notFound.tag');
    }
  }

  private async resourceHasTag(
    resourceId: string,
    tagId: string,
    transaction?: Transaction
  ): Promise<boolean> {
    await this.resourceExists(resourceId, transaction);
    await this.tagExists(tagId, transaction);
    const existingResourceTags = await this.repositories.resourceTagRepository.getResourceTags(
      { resourceId },
      transaction
    );

    return existingResourceTags.some((rt) => rt.tagId === tagId);
  }

  public async getResourceTags(
    params: { resourceId: string },
    transaction?: Transaction
  ): Promise<ResourceTag[]> {
    const context = 'ResourceTagService.getResourceTags';
    const validatedParams = validateInput(getResourceTagsParamsSchema, params, context);
    const { resourceId } = validatedParams;

    await this.resourceExists(resourceId, transaction);

    const result = await this.repositories.resourceTagRepository.getResourceTags(
      params,
      transaction
    );
    return validateOutput(createDynamicSingleSchema(resourceTagSchema).array(), result, context);
  }

  public async getResourceTagIntersection(
    params: {
      resourceIds: string[];
      tagIds: string[];
    },
    transaction?: Transaction
  ): Promise<ResourceTag[]> {
    const context = 'ResourceTagService.getResourceTagIntersection';
    const validatedParams = validateInput(getResourceTagIntersectionInputSchema, params, context);
    const { resourceIds, tagIds } = validatedParams;

    const resourceTags = await this.repositories.resourceTagRepository.getResourceTagIntersection(
      resourceIds,
      tagIds,
      transaction
    );
    return validateOutput(resourceTagSchema.array(), resourceTags, context);
  }

  public async addResourceTag(
    params: AddResourceTagInput,
    transaction?: Transaction
  ): Promise<ResourceTag> {
    const context = 'ResourceTagService.addResourceTag';
    const validatedParams = validateInput(addResourceTagInputSchema, params, context);
    const { resourceId, tagId, isPrimary } = validatedParams;

    const hasTag = await this.resourceHasTag(resourceId, tagId, transaction);

    if (hasTag) {
      throw new ConflictError('Resource already has this tag', 'errors:conflict.duplicateEntry', {
        resource: 'ResourceTag',
        field: 'tagId',
      });
    }

    const resourceTag = await this.repositories.resourceTagRepository.addResourceTag(
      { resourceId, tagId, isPrimary },
      transaction
    );

    const newValues = {
      id: resourceTag.id,
      resourceId: resourceTag.resourceId,
      tagId: resourceTag.tagId,
      createdAt: resourceTag.createdAt,
      updatedAt: resourceTag.updatedAt,
    };

    const metadata = {
      context,
    };

    await this.logCreate(resourceTag.id, newValues, metadata, transaction);

    return validateOutput(createDynamicSingleSchema(resourceTagSchema), resourceTag, context);
  }

  public async updateResourceTag(
    params: UpdateResourceTagInput,
    transaction?: Transaction
  ): Promise<ResourceTag> {
    const context = 'ResourceTagService.updateResourceTag';
    const validatedParams = validateInput(updateResourceTagInputSchema, params, context);
    const { resourceId, tagId, isPrimary } = validatedParams;

    const resourceTag = await this.repositories.resourceTagRepository.getResourceTag(
      { resourceId, tagId },
      transaction
    );

    const updatedResourceTag = await this.repositories.resourceTagRepository.updateResourceTag(
      { resourceId, tagId, isPrimary },
      transaction
    );

    const metadata = {
      context,
    };

    await this.logUpdate(
      updatedResourceTag.id,
      resourceTag,
      updatedResourceTag,
      metadata,
      transaction
    );

    return validateOutput(
      createDynamicSingleSchema(resourceTagSchema),
      updatedResourceTag,
      context
    );
  }

  public async removeResourceTag(
    params: RemoveResourceTagInput & DeleteParams,
    transaction?: Transaction
  ): Promise<ResourceTag> {
    const context = 'ResourceTagService.removeResourceTag';
    const validatedParams = validateInput(removeResourceTagInputSchema, params, context);
    const { resourceId, tagId, hardDelete } = validatedParams;

    const hasTag = await this.resourceHasTag(resourceId, tagId, transaction);

    if (!hasTag) {
      throw new NotFoundError('Resource does not have this tag', 'errors:notFound.tag');
    }

    const isHardDelete = hardDelete === true;

    const resourceTag = isHardDelete
      ? await this.repositories.resourceTagRepository.hardDeleteResourceTag(
          validatedParams,
          transaction
        )
      : await this.repositories.resourceTagRepository.softDeleteResourceTag(
          validatedParams,
          transaction
        );

    const oldValues = {
      id: resourceTag.id,
      resourceId: resourceTag.resourceId,
      tagId: resourceTag.tagId,
      createdAt: resourceTag.createdAt,
      updatedAt: resourceTag.updatedAt,
    };

    const newValues = {
      ...oldValues,
      deletedAt: resourceTag.deletedAt,
    };

    const metadata = {
      context,
      hardDelete,
    };

    if (isHardDelete) {
      await this.logHardDelete(resourceTag.id, oldValues, metadata, transaction);
    } else {
      await this.logSoftDelete(resourceTag.id, oldValues, newValues, metadata, transaction);
    }

    return validateOutput(createDynamicSingleSchema(resourceTagSchema), resourceTag, context);
  }

  public async removeResourceTags(
    params: { tagId: string } & DeleteParams,
    transaction?: Transaction
  ): Promise<ResourceTag[]> {
    const context = 'ResourceTagService.removeResourceTags';
    const validatedParams = validateInput(removeResourceTagsInputSchema, params, context);
    const { tagId, hardDelete } = validatedParams;

    const resourceTags = await this.repositories.resourceTagRepository.getResourceTags(
      { tagId },
      transaction
    );

    const isHardDelete = hardDelete === true;

    const deletedResourceTags = await Promise.all(
      resourceTags.map((resourceTag) =>
        isHardDelete
          ? this.repositories.resourceTagRepository.hardDeleteResourceTag(resourceTag, transaction)
          : this.repositories.resourceTagRepository.softDeleteResourceTag(resourceTag, transaction)
      )
    );

    return validateOutput(
      createDynamicSingleSchema(resourceTagSchema).array(),
      deletedResourceTags,
      context
    );
  }
}
