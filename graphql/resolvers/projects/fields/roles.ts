import { ProjectResolvers } from '@/graphql/generated/types';
import { getDirectFieldSelection } from '@/graphql/lib/fieldSelection';
import { RoleModel } from '@/graphql/repositories/roles/schema';

export const projectRolesResolver: ProjectResolvers['roles'] = async (
  parent,
  _args,
  context,
  info
) => {
  const projectId = parent.id;
  const requestedFields = getDirectFieldSelection<keyof RoleModel>(info);
  if (parent.roles) {
    return parent.roles;
  }

  return await context.controllers.projects.getProjectRoles(projectId, requestedFields);
};
