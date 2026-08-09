/**
 * Resource-domain service port interfaces.
 * Covers: Resource, ResourceTag.
 */
import type {
  AddResourceTagInput,
  CreateResourceInput,
  MutationDeleteResourceArgs,
  QueryResourcesArgs,
  RemoveResourceTagInput,
  Resource,
  ResourcePage,
  ResourceTag,
  Scope,
  UpdateResourceInput,
  UpdateResourceTagInput,
} from '@grantjs/schema';

import type { SelectedFields } from '../repositories/common';
import type { DeleteParams } from '../repositories/common';

// ---------------------------------------------------------------------------
// IResourceService
// ---------------------------------------------------------------------------

export interface IResourceService {
  getResources(
    params: Omit<QueryResourcesArgs, 'scope'> & SelectedFields<Resource>
  ): Promise<ResourcePage>;

  /** Resolve resource by id (e.g. for Permission.resource when permission was loaded in scoped context). */
  getResourceById(id: string, transaction?: unknown): Promise<Resource | null>;

  createResource(
    params: Omit<CreateResourceInput, 'scope' | 'createPermissions' | 'tagIds' | 'primaryTagId'>,
    transaction?: unknown
  ): Promise<Resource>;

  updateResource(
    params: {
      id: string;
      input: Omit<UpdateResourceInput, 'id' | 'scope'> & { scope: Scope };
    },
    transaction?: unknown
  ): Promise<Resource>;

  validateSlugUniqueness(
    slug: string,
    resourceIds: string[],
    excludeResourceId?: string,
    transaction?: unknown
  ): Promise<void>;

  deleteResource(
    params: Omit<MutationDeleteResourceArgs, 'scope'> & DeleteParams,
    transaction?: unknown
  ): Promise<Resource>;
}

// ---------------------------------------------------------------------------
// IResourceTagService
// ---------------------------------------------------------------------------

export interface IResourceTagService {
  getResourceTags(params: { resourceId: string }, transaction?: unknown): Promise<ResourceTag[]>;

  getResourceTagsByResourceIds(
    resourceIds: string[],
    transaction?: unknown
  ): Promise<ResourceTag[]>;

  getResourceTagIntersection(
    params: { resourceIds: string[]; tagIds: string[] },
    transaction?: unknown
  ): Promise<ResourceTag[]>;

  addResourceTag(params: AddResourceTagInput, transaction?: unknown): Promise<ResourceTag>;

  updateResourceTag(params: UpdateResourceTagInput, transaction?: unknown): Promise<ResourceTag>;

  removeResourceTag(
    params: RemoveResourceTagInput & DeleteParams,
    transaction?: unknown
  ): Promise<ResourceTag>;

  removeResourceTags(
    params: { tagId: string } & DeleteParams,
    transaction?: unknown
  ): Promise<ResourceTag[]>;
}
