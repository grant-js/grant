import { ResourceResolver } from '@/lib/authorization';

import { createProjectResourceResolver, ProjectResourceData } from './project.resolver';
import { TagResourceData, createTagResourceResolver } from './tag.resolver';
import { UserResourceData, createUserResourceResolver } from './user.resolver';

export type ResourceResolvers = ReturnType<typeof createResourceResolvers>;

export interface ResourceResolversMap {
  project: ResourceResolver<ProjectResourceData>;
  user: ResourceResolver<UserResourceData>;
  tag: ResourceResolver<TagResourceData>;
}

export function createResourceResolvers(): ResourceResolversMap {
  return {
    project: createProjectResourceResolver(),
    user: createUserResourceResolver(),
    tag: createTagResourceResolver(),
  };
}
