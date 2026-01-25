import { GroupModel } from '@grantjs/database';
import { QueryResolvers } from '@grantjs/schema';

import { GraphqlContext } from '@/graphql/types';
import { getDirectFieldSelection } from '@/lib/field-selection.lib';

export const getGroupsResolver: QueryResolvers<GraphqlContext>['groups'] = async (
  _parent,
  { scope, page, limit, sort, search, ids, tagIds },
  context,
  info
) => {
  const requestedFields = getDirectFieldSelection<keyof GroupModel>(info, ['groups']);

  const groups = await context.handlers.groups.getGroups({
    scope,
    page,
    limit,
    sort,
    search,
    ids,
    tagIds,
    requestedFields,
  });

  return groups;
};
