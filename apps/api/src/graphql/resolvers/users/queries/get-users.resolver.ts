import { UserModel } from '@grantjs/database';
import { QueryResolvers } from '@grantjs/schema';

import { GraphqlContext } from '@/graphql/types';
import { getDirectFieldSelection } from '@/lib/field-selection.lib';

export const getUsersResolver: QueryResolvers<GraphqlContext>['users'] = async (
  _parent,
  { scope, page, limit, sort, search, ids, tagIds },
  context,
  info
) => {
  const requestedFields = getDirectFieldSelection<keyof UserModel>(info, ['users']);

  const users = await context.handlers.users.getUsers({
    scope,
    page,
    limit,
    sort,
    search,
    ids,
    tagIds,
    requestedFields,
  });

  return users;
};
