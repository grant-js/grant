import { ProjectPermissionResolvers, ProjectPermission } from '@/graphql/generated/types';
import { createProjectPermissionFieldResolver } from '@/graphql/resolvers/common';

export const projectPermissionPermissionResolver: ProjectPermissionResolvers['permission'] =
  createProjectPermissionFieldResolver<ProjectPermission>();
