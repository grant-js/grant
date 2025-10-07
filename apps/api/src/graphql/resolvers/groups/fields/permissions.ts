import { GroupResolvers } from '@logusgraphics/grant-schema';

import { GraphqlContext } from '@/graphql/types';

export const groupPermissionsResolver: GroupResolvers<GraphqlContext>['permissions'] = async (
  parent,
  _args,
  context
) => {
  const groupId = parent.id;

  if (parent.permissions) {
    return parent.permissions;
  }

  return await context.controllers.groups.getGroupPermissions({
    groupId,
    requestedFields: ['permissions'],
  });
};
