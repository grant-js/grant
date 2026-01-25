import { GroupResolvers } from '@grantjs/schema';

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

  return await context.handlers.groups.getGroupPermissions({
    groupId,
    requestedFields: ['permissions'],
  });
};
