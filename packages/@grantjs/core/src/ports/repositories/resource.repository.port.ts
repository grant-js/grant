/**
 * Resource-domain repository port interfaces.
 * Implementations (Drizzle-based) live in apps/api.
 */
import type { SelectedFields } from './common';
import type {
  AddResourceTagInput,
  CreateResourceInput,
  MutationDeleteResourceArgs,
  MutationUpdateResourceArgs,
  QueryResourceTagsInput,
  QueryResourcesArgs,
  RemoveResourceTagInput,
  Resource,
  ResourcePage,
  ResourceTag,
  UpdateResourceTagInput,
} from '@grantjs/schema';

export interface IResourceRepository {
  getResources(
    params: Omit<QueryResourcesArgs, 'scope' | 'tagIds'> & SelectedFields<Resource>,
    transaction?: unknown
  ): Promise<ResourcePage>;

  createResource(
    params: Omit<CreateResourceInput, 'scope'>,
    transaction?: unknown
  ): Promise<Resource>;

  updateResource(params: MutationUpdateResourceArgs, transaction?: unknown): Promise<Resource>;

  softDeleteResource(
    params: Omit<MutationDeleteResourceArgs, 'scope'>,
    transaction?: unknown
  ): Promise<Resource>;

  hardDeleteResource(
    params: Omit<MutationDeleteResourceArgs, 'scope'>,
    transaction?: unknown
  ): Promise<Resource>;

  findResourceBySlug(
    slug: string,
    resourceIds: string[],
    transaction?: unknown
  ): Promise<Resource | null>;
}

export interface IResourceTagRepository {
  getResourceTags(params: QueryResourceTagsInput, transaction?: unknown): Promise<ResourceTag[]>;
  getResourceTag(params: QueryResourceTagsInput, transaction?: unknown): Promise<ResourceTag>;
  getResourceTagIntersection(
    resourceIds: string[],
    tagIds: string[],
    transaction?: unknown
  ): Promise<ResourceTag[]>;
  addResourceTag(params: AddResourceTagInput, transaction?: unknown): Promise<ResourceTag>;
  updateResourceTag(params: UpdateResourceTagInput, transaction?: unknown): Promise<ResourceTag>;
  softDeleteResourceTag(
    params: RemoveResourceTagInput,
    transaction?: unknown
  ): Promise<ResourceTag>;
  hardDeleteResourceTag(
    params: RemoveResourceTagInput,
    transaction?: unknown
  ): Promise<ResourceTag>;
}
