import { ProjectRoleResolvers, ProjectRole } from '@/graphql/generated/types';
import { createProjectFieldResolver } from '@/graphql/resolvers/common';

export const projectRoleProjectResolver: ProjectRoleResolvers['project'] =
  createProjectFieldResolver<ProjectRole>();
