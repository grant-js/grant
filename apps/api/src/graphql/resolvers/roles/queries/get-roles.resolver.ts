import { RoleModel } from '@grantjs/database';
import { QueryResolvers } from '@grantjs/schema';

import { GraphqlContext } from '@/graphql/types';
import { getDirectFieldSelection } from '@/lib/field-selection.lib';

export const getRolesResolver: QueryResolvers<GraphqlContext>['roles'] = async (
  _parent,
  { scope, page, limit, sort, search, ids, tagIds },
  context,
  info
) => {
  const requestedFields = getDirectFieldSelection<keyof RoleModel>(info, ['roles']);

  const roles = await context.handlers.roles.getRoles({
    scope,
    page,
    limit,
    sort,
    search,
    ids,
    tagIds,
    requestedFields,
  });

  return roles;
};
