import { ProjectRoleResolvers, ProjectRole } from '@/graphql/generated/types';
import { createProjectRoleFieldResolver } from '@/graphql/resolvers/common';

export const projectRoleRoleResolver: ProjectRoleResolvers['role'] =
  createProjectRoleFieldResolver<ProjectRole>();
