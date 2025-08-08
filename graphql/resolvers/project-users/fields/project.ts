import { ProjectUserResolvers, ProjectUser } from '@/graphql/generated/types';
import { createProjectFieldResolver } from '@/graphql/resolvers/common';

export const projectUserProjectResolver: ProjectUserResolvers['project'] =
  createProjectFieldResolver<ProjectUser>();
