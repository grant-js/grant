import { ProjectGroupResolvers, ProjectGroup } from '@/graphql/generated/types';
import { createProjectGroupFieldResolver } from '@/graphql/resolvers/common';

export const projectGroupGroupResolver: ProjectGroupResolvers['group'] =
  createProjectGroupFieldResolver<ProjectGroup>();
