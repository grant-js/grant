import { ProjectResolvers, Tenant } from '@/graphql/generated/types';
import { getDirectFieldSelection } from '@/graphql/lib/fieldSelection';
import { getScopedRoleIds } from '@/graphql/lib/scopeFiltering';

export const projectRolesResolver: ProjectResolvers['roles'] = async (
  parent,
  _args,
  context,
  info
) => {
  const projectId = parent.id;
  const requestedFields = info ? getDirectFieldSelection(info) : undefined;

  const projectRoles = await context.services.projectRoles.getProjectRoles({ projectId });
  const roleIds = projectRoles.map((pr) => pr.roleId);
  if (roleIds.length === 0) {
    return [];
  }

  // Get scoped role IDs for this project
  const scope = { tenant: Tenant.Project, id: projectId };
  const scopedRoleIds = await getScopedRoleIds({ scope, context });

  // Filter to only include roles that are in scope
  const filteredRoleIds = roleIds.filter((roleId) => scopedRoleIds.includes(roleId));

  if (filteredRoleIds.length === 0) {
    return [];
  }

  const rolesResult = await context.services.roles.getRoles({
    ids: filteredRoleIds,
    limit: -1,
    requestedFields,
  });
  return rolesResult.roles;
};
