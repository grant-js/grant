import { RoleResolvers } from '@grantjs/schema';

import { GraphqlContext } from '@/graphql/types';
import { resolvePrimaryTagFromPivots } from '@/lib/graphql/primary-tag-resolver.lib';

export const rolePrimaryTagResolver: RoleResolvers<GraphqlContext>['primaryTag'] = async (
  parent,
  _args,
  context
) => {
  const pivots = await context.handlers.roles.getRoleTagPivots({ roleId: parent.id });
  return resolvePrimaryTagFromPivots(context, pivots);
};

export const roleGroupCountResolver: RoleResolvers<GraphqlContext>['groupCount'] = async (
  parent,
  _args,
  context
) => {
  if (typeof parent.groupCount === 'number') {
    return parent.groupCount;
  }
  return context.handlers.roles.countRoleGroups({ roleId: parent.id });
};

export const rolePermissionCountResolver: RoleResolvers<GraphqlContext>['permissionCount'] = async (
  parent,
  _args,
  context
) => {
  if (typeof parent.permissionCount === 'number') {
    return parent.permissionCount;
  }
  return context.handlers.roles.countRolePermissions({ roleId: parent.id });
};

export const roleTagCountResolver: RoleResolvers<GraphqlContext>['tagCount'] = async (
  parent,
  _args,
  context
) => {
  if (typeof parent.tagCount === 'number') {
    return parent.tagCount;
  }
  const pivots = await context.handlers.roles.getRoleTagPivots({ roleId: parent.id });
  return pivots.length;
};
