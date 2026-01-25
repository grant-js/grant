import { RoleResolvers } from '@grantjs/schema';

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

  return await context.handlers.roles.getRoleGroups({
    roleId,
    requestedFields: ['groups'],
  });
};
