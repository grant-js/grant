import { OrganizationResolvers, Tenant } from '@/graphql/generated/types';
import { getDirectFieldSelection } from '@/graphql/lib/fieldSelection';
import { getScopedRoleIds } from '@/graphql/lib/scopeFiltering';

export const organizationRolesResolver: OrganizationResolvers['roles'] = async (
  parent,
  _args,
  context,
  info
) => {
  const organizationId = parent.id;
  const requestedFields = info ? getDirectFieldSelection(info) : undefined;

  const organizationRoles = await context.services.organizationRoles.getOrganizationRoles({
    organizationId,
  });
  const roleIds = organizationRoles.map((or) => or.roleId);
  if (roleIds.length === 0) {
    return [];
  }

  const scope = { tenant: Tenant.Organization, id: organizationId };
  const scopedRoleIds = await getScopedRoleIds({ scope, context });

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
