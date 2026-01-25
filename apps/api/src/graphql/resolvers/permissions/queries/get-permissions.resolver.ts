import { PermissionModel } from '@grantjs/database';
import { QueryResolvers } from '@grantjs/schema';

import { GraphqlContext } from '@/graphql/types';
import { getDirectFieldSelection } from '@/lib/field-selection.lib';

export const getPermissionsResolver: QueryResolvers<GraphqlContext>['permissions'] = async (
  _parent,
  { scope, page, limit, sort, search, ids, tagIds },
  context,
  info
) => {
  const requestedFields = getDirectFieldSelection<keyof PermissionModel>(info, ['permissions']);

  const permissions = await context.handlers.permissions.getPermissions({
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
