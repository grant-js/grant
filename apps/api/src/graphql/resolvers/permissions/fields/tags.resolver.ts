import { PermissionResolvers } from '@grantjs/schema';

import { GraphqlContext } from '@/graphql/types';

export const permissionTagsResolver: PermissionResolvers<GraphqlContext>['tags'] = async (
  parent,
  _args,
  context
) => {
  const permissionId = parent.id;

  if (parent.tags) {
    return parent.tags;
  }

  return await context.handlers.permissions.getPermissionTags({
    permissionId,
    requestedFields: ['tags'],
  });
};
