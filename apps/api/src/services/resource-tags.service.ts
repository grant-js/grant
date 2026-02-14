import {
  AddResourceTagInput,
  RemoveResourceTagInput,
  ResourceTag,
  UpdateResourceTagInput,
} from '@grantjs/schema';

import { ConflictError, NotFoundError } from '@/lib/errors';
import { Transaction } from '@/lib/transaction-manager.lib';
import { DeleteParams } from '@/types';

import { createDynamicSingleSchema, validateInput, validateOutput } from './common';
import {
  addResourceTagInputSchema,
  getResourceTagIntersectionInputSchema,
  getResourceTagsParamsSchema,
  removeResourceTagInputSchema,
  removeResourceTagsInputSchema,
  resourceTagSchema,
  updateResourceTagInputSchema,
} from './resource-tags.schemas';

import type {
  IAuditLogger,
  IResourceRepository,
  IResourceTagRepository,
  IResourceTagService,
  ITagRepository,
} from '@grantjs/core';

export class ResourceTagService implements IResourceTagService {
  constructor(
    private readonly resourceRepository: IResourceRepository,
    private readonly tagRepository: ITagRepository,
    private readonly resourceTagRepository: IResourceTagRepository,
    private readonly audit: IAuditLogger
  ) {}

  private async resourceExists(resourceId: string, transaction?: Transaction): Promise<void> {
    const resources = await this.resourceRepository.getResources(
      { ids: [resourceId], limit: 1 },
      transaction
    );

    if (resources.resources.length === 0) {
      throw new NotFoundError('Resource');
    }
  }

  private async tagExists(tagId: string, transaction?: Transaction): Promise<void> {
    const tags = await this.tagRepository.getTags({ ids: [tagId], limit: 1 }, transaction);

    if (tags.tags.length === 0) {
      throw new NotFoundError('Tag');
    }
  }

  private async resourceHasTag(
    resourceId: string,
    tagId: string,
    transaction?: Transaction
  ): Promise<boolean> {
    await this.resourceExists(resourceId, transaction);
    await this.tagExists(tagId, transaction);
    const existingResourceTags = await this.resourceTagRepository.getResourceTags(
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

    const result = await this.resourceTagRepository.getResourceTags(params, transaction);
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

    const resourceTags = await this.resourceTagRepository.getResourceTagIntersection(
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
      throw new ConflictError('Resource already has this tag', 'ResourceTag', 'tagId');
    }

    const resourceTag = await this.resourceTagRepository.addResourceTag(
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

    await this.audit.logCreate(resourceTag.id, newValues, metadata, transaction);

    return validateOutput(createDynamicSingleSchema(resourceTagSchema), resourceTag, context);
  }

  public async updateResourceTag(
    params: UpdateResourceTagInput,
    transaction?: Transaction
  ): Promise<ResourceTag> {
    const context = 'ResourceTagService.updateResourceTag';
    const validatedParams = validateInput(updateResourceTagInputSchema, params, context);
    const { resourceId, tagId, isPrimary } = validatedParams;

    const resourceTag = await this.resourceTagRepository.getResourceTag(
      { resourceId, tagId },
      transaction
    );

    const updatedResourceTag = await this.resourceTagRepository.updateResourceTag(
      { resourceId, tagId, isPrimary },
      transaction
    );

    const metadata = {
      context,
    };

    await this.audit.logUpdate(
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
      throw new NotFoundError('Tag');
    }

    const isHardDelete = hardDelete === true;

    const resourceTag = isHardDelete
      ? await this.resourceTagRepository.hardDeleteResourceTag(validatedParams, transaction)
      : await this.resourceTagRepository.softDeleteResourceTag(validatedParams, transaction);

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
      await this.audit.logHardDelete(resourceTag.id, oldValues, metadata, transaction);
    } else {
      await this.audit.logSoftDelete(resourceTag.id, oldValues, newValues, metadata, transaction);
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

    const resourceTags = await this.resourceTagRepository.getResourceTags({ tagId }, transaction);

    const isHardDelete = hardDelete === true;

    const deletedResourceTags = await Promise.all(
      resourceTags.map((resourceTag) =>
        isHardDelete
          ? this.resourceTagRepository.hardDeleteResourceTag(resourceTag, transaction)
          : this.resourceTagRepository.softDeleteResourceTag(resourceTag, transaction)
      )
    );

    return validateOutput(
      createDynamicSingleSchema(resourceTagSchema).array(),
      deletedResourceTags,
      context
    );
  }
}
