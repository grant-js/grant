import { ProjectUserResolvers, ProjectUser } from '@/graphql/generated/types';
import { createProjectUserFieldResolver } from '@/graphql/resolvers/common';

export const projectUserUserResolver: ProjectUserResolvers['user'] =
  createProjectUserFieldResolver<ProjectUser>();
