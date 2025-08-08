import { ProjectPermissionResolvers, ProjectPermission } from '@/graphql/generated/types';
import { createProjectFieldResolver } from '@/graphql/resolvers/common';

export const projectPermissionProjectResolver: ProjectPermissionResolvers['project'] =
  createProjectFieldResolver<ProjectPermission>();
