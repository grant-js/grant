import { RoleResolvers } from '@grantjs/schema';

import { GraphqlContext } from '@/graphql/types';

export const rolePermissionsResolver: RoleResolvers<GraphqlContext>['rolePermissions'] = async (
  parent,
  _args,
  context
) => {
  const roleId = parent.id;

  if (parent.rolePermissions) {
    return parent.rolePermissions;
  }

  return await context.handlers.roles.getRolePermissions({ roleId });
};
