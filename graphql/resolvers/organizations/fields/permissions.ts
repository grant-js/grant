import { OrganizationResolvers, Tenant } from '@/graphql/generated/types';
import { getDirectFieldSelection } from '@/graphql/lib/fieldSelection';
import { getScopedPermissionIds } from '@/graphql/lib/scopeFiltering';

export const organizationPermissionsResolver: OrganizationResolvers['permissions'] = async (
  parent,
  _args,
  context,
  info
) => {
  const organizationId = parent.id;
  const requestedFields = info ? getDirectFieldSelection(info) : undefined;

  const organizationPermissions =
    await context.services.organizationPermissions.getOrganizationPermissions({
      organizationId,
    });

  const permissionIds = organizationPermissions.map((op) => op.permissionId);

  if (permissionIds.length === 0) {
    return [];
  }

  const scope = { tenant: Tenant.Organization, id: organizationId };
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
