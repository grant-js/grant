import { ProjectResolvers } from '@/graphql/generated/types';
import { getDirectFieldSelection } from '@/graphql/lib/fieldSelection';
import { PermissionModel } from '@/graphql/repositories/permissions/schema';

export const projectPermissionsResolver: ProjectResolvers['permissions'] = async (
  parent,
  _args,
  context,
  info
) => {
  const projectId = parent.id;
  const requestedFields = getDirectFieldSelection<keyof PermissionModel>(info);
  if (parent.permissions) {
    return parent.permissions;
  }
  return await context.controllers.projects.getProjectPermissions(projectId, requestedFields);
};
