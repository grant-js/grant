import { RoleResolvers } from '@logusgraphics/grant-schema';

import { GraphqlContext } from '@/graphql/types';

export const roleGroupsResolver: RoleResolvers<GraphqlContext>['groups'] = async (
  parent,
  _args,
  context
) => {
  const roleId = parent.id;

  if (parent.groups) {
    return parent.groups;
  }

  return await context.controllers.roles.getRoleGroups({
    roleId,
    requestedFields: ['groups'],
  });
};
