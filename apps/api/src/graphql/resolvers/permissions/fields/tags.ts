import { PermissionResolvers } from '@logusgraphics/grant-schema';

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

  return await context.controllers.permissions.getPermissionTags({
    permissionId,
    requestedFields: ['tags'],
  });
};
