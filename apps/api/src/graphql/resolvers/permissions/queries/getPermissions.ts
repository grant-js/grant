import { PermissionModel } from '@logusgraphics/grant-database';
import { QueryResolvers } from '@logusgraphics/grant-schema';

import { getDirectFieldSelection } from '@/graphql/lib/fieldSelection';
import { GraphqlContext } from '@/graphql/types';

export const getPermissionsResolver: QueryResolvers<GraphqlContext>['permissions'] = async (
  _parent,
  { scope, page = 1, limit = 10, sort, search, ids, tagIds },
  context,
  info
) => {
  const requestedFields = getDirectFieldSelection<keyof PermissionModel>(info, ['permissions']);

  const permissions = await context.controllers.permissions.getPermissions({
    scope,
    page,
    limit,
    sort,
    search,
    ids,
    tagIds,
    requestedFields,
  });

  return permissions;
};
