import type {
  IAuditLogger,
  IEventPublisher,
  IResourceRepository,
  IResourceService,
} from '@grantjs/core';
import {
  CreateResourceInput,
  MutationDeleteResourceArgs,
  QueryResourcesArgs,
  Resource,
  ResourcePage,
  Scope,
  UpdateResourceInput,
} from '@grantjs/schema';

import { ConflictError, NotFoundError } from '@/lib/errors';
import { buildDelta } from '@/lib/events';
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
  createResourceParamsSchema,
  deleteResourceParamsSchema,
  getResourcesParamsSchema,
  resourceSchema,
  updateResourceParamsSchema,
} from './resources.schemas';

export class ResourceService implements IResourceService {
  constructor(
    private readonly resourceRepository: IResourceRepository,
    private readonly audit: IAuditLogger,
    private readonly events: IEventPublisher
  ) {}

  private async getResource(resourceId: string, transaction?: Transaction): Promise<Resource> {
    const existingResources = await this.resourceRepository.getResources(
      { ids: [resourceId], limit: 1 },
      transaction
    );

    if (existingResources.resources.length === 0) {
      throw new NotFoundError('Resource');
    }

    return existingResources.resources[0];
  }

  public async getResourceById(id: string, transaction?: Transaction): Promise<Resource | null> {
    try {
      return await this.getResource(id, transaction);
    } catch {
      return null;
    }
  }

  public async getResources(
    params: Omit<QueryResourcesArgs, 'scope'> & SelectedFields<Resource>
  ): Promise<ResourcePage> {
    const context = 'ResourceService.getResources';
    validateInput(getResourcesParamsSchema, params, context);

    const result = await this.resourceRepository.getResources(params);

    validatePage(
      createDynamicPaginatedSchema(resourceSchema, params.requestedFields),
      result.resources,
      result,
      context
    );

    return result;
  }

  public async createResource(
    params: Omit<CreateResourceInput, 'scope' | 'createPermissions' | 'tagIds' | 'primaryTagId'>,
    transaction?: Transaction
  ): Promise<Resource> {
    const context = 'ResourceService.createResource';
    const validatedParams = validateInput(createResourceParamsSchema, params, context);

    const resource = await this.resourceRepository.createResource(validatedParams, transaction);

    const newValues = {
      id: resource.id,
      name: resource.name,
      slug: resource.slug,
      description: resource.description,
      actions: resource.actions,
      isActive: resource.isActive,
      createdAt: resource.createdAt,
      updatedAt: resource.updatedAt,
    };

    const metadata = {
      context,
    };

    await this.audit.logCreate(resource.id, newValues, metadata, transaction);

    await this.events.publish(
      {
        type: 'resource.created',
        aggregate: { kind: 'resource', id: resource.id },
        data: { after: newValues },
      },
      transaction
    );

    return validateOutput(createDynamicSingleSchema(resourceSchema), resource, context);
  }

  public async updateResource(
    params: { id: string; input: Omit<UpdateResourceInput, 'id' | 'scope'> & { scope: Scope } },
    transaction?: Transaction
  ): Promise<Resource> {
    const context = 'ResourceService.updateResource';
    const validatedParams = validateInput(updateResourceParamsSchema, params, context);

    const { id, input } = validatedParams;

    const oldResource = await this.getResource(id, transaction);
    const updatedResource = await this.resourceRepository.updateResource(
      { id, input },
      transaction
    );

    const oldValues = {
      id: oldResource.id,
      name: oldResource.name,
      slug: oldResource.slug,
      description: oldResource.description,
      actions: oldResource.actions,
      isActive: oldResource.isActive,
      createdAt: oldResource.createdAt,
      updatedAt: oldResource.updatedAt,
    };

    const newValues = {
      id: updatedResource.id,
      name: updatedResource.name,
      slug: updatedResource.slug,
      description: updatedResource.description,
      actions: updatedResource.actions,
      isActive: updatedResource.isActive,
      createdAt: updatedResource.createdAt,
      updatedAt: updatedResource.updatedAt,
    };

    const metadata = {
      context,
    };

    await this.audit.logUpdate(updatedResource.id, oldValues, newValues, metadata, transaction);

    await this.events.publish(
      {
        type: 'resource.updated',
        aggregate: { kind: 'resource', id: updatedResource.id },
        data: { before: oldValues, after: newValues, delta: buildDelta(oldValues, newValues) },
      },
      transaction
    );

    return validateOutput(createDynamicSingleSchema(resourceSchema), updatedResource, context);
  }

  public async validateSlugUniqueness(
    slug: string,
    resourceIds: string[],
    excludeResourceId?: string,
    transaction?: Transaction
  ): Promise<void> {
    const resourceIdsToCheck = excludeResourceId
      ? resourceIds.filter((id) => id !== excludeResourceId)
      : resourceIds;

    if (resourceIdsToCheck.length === 0) {
      return;
    }

    const existingResource = await this.resourceRepository.findResourceBySlug(
      slug,
      resourceIdsToCheck,
      transaction
    );

    if (existingResource) {
      throw new ConflictError(
        `Resource with slug '${slug}' already exists in this scope`,
        'Resource',
        'slug'
      );
    }
  }

  public async deleteResource(
    params: Omit<MutationDeleteResourceArgs, 'scope'> & DeleteParams,
    transaction?: Transaction
  ): Promise<Resource> {
    const context = 'ResourceService.deleteResource';
    const validatedParams = validateInput(deleteResourceParamsSchema, params, context);

    const { id, hardDelete } = validatedParams;

    const oldResource = await this.getResource(id, transaction);
    const isHardDelete = hardDelete === true;

    const deletedResource = isHardDelete
      ? await this.resourceRepository.hardDeleteResource(validatedParams, transaction)
      : await this.resourceRepository.softDeleteResource(validatedParams, transaction);

    const oldValues = {
      id: oldResource.id,
      name: oldResource.name,
      slug: oldResource.slug,
      description: oldResource.description,
      actions: oldResource.actions,
      isActive: oldResource.isActive,
      createdAt: oldResource.createdAt,
      updatedAt: oldResource.updatedAt,
    };

    const metadata = {
      context,
      hardDelete,
    };

    if (isHardDelete) {
      await this.audit.logHardDelete(deletedResource.id, oldValues, metadata, transaction);
    } else {
      const newValues = {
        ...oldValues,
        deletedAt: deletedResource.deletedAt,
      };

      await this.audit.logSoftDelete(
        deletedResource.id,
        oldValues,
        newValues,
        metadata,
        transaction
      );
    }

    await this.events.publish(
      {
        type: 'resource.deleted',
        aggregate: { kind: 'resource', id: deletedResource.id },
        data: { before: oldValues },
      },
      transaction
    );

    return validateOutput(createDynamicSingleSchema(resourceSchema), deletedResource, context);
  }
}
