import { ProjectGroupResolvers, ProjectGroup } from '@/graphql/generated/types';
import { createProjectFieldResolver } from '@/graphql/resolvers/common';

export const projectGroupProjectResolver: ProjectGroupResolvers['project'] =
  createProjectFieldResolver<ProjectGroup>();
