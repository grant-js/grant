import { ProjectResolvers, Tenant } from '@/graphql/generated/types';
import { getDirectFieldSelection } from '@/graphql/lib/fieldSelection';
import { getScopedPermissionIds } from '@/graphql/lib/scopeFiltering';

export const projectPermissionsResolver: ProjectResolvers['permissions'] = async (
  parent,
  _args,
  context,
  info
) => {
  const projectId = parent.id;
  const requestedFields = info ? getDirectFieldSelection(info) : undefined;

  const projectPermissions = await context.services.projectPermissions.getProjectPermissions({
    projectId,
  });

  const permissionIds = projectPermissions.map((pp) => pp.permissionId);

  if (permissionIds.length === 0) {
    return [];
  }

  const scope = { tenant: Tenant.Project, id: projectId };
  const scopedPermissionIds = await getScopedPermissionIds({ scope, context });

  const filteredPermissionIds = permissionIds.filter((permissionId) =>
    scopedPermissionIds.includes(permissionId)
  );

  if (filteredPermissionIds.length === 0) {
    return [];
  }

  const permissionsResult = await context.services.permissions.getPermissions({
    ids: filteredPermissionIds,
    limit: -1,
    requestedFields,
  });

  return permissionsResult.permissions;
};
