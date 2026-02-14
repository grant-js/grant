/**
 * Resource-domain service port interfaces.
 * Covers: Resource, ResourceTag.
 */
import type { DeleteParams } from './user.service.port';
import type { SelectedFields } from '../repositories/common';
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

// ---------------------------------------------------------------------------
// IResourceService
// ---------------------------------------------------------------------------

export interface IResourceService {
  getResources(
    params: Omit<QueryResourcesArgs, 'scope'> & SelectedFields<Resource>
  ): Promise<ResourcePage>;

  createResource(
    params: Omit<CreateResourceInput, 'scope'>,
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
