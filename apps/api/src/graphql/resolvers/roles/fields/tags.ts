import { RoleResolvers } from '@logusgraphics/grant-schema';

import { GraphqlContext } from '@/graphql/types';

export const roleTagsResolver: RoleResolvers<GraphqlContext>['tags'] = async (
  parent,
  _args,
  context
) => {
  const roleId = parent.id;

  if (parent.tags) {
    return parent.tags;
  }

  return await context.controllers.roles.getRoleTags({
    roleId,
    requestedFields: ['tags'],
  });
};
