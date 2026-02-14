import { QueryResolvers, Resource } from '@grantjs/schema';

import { GraphqlContext } from '@/graphql/types';
import { getDirectFieldSelection } from '@/lib/field-selection.lib';

export const getResourcesResolver: QueryResolvers<GraphqlContext>['resources'] = async (
  _parent,
  { scope, page, limit, sort, search, ids, tagIds, isActive },
  context,
  info
) => {
  const requestedFields = getDirectFieldSelection<keyof Resource>(info, ['resources']);

  const resources = await context.handlers.resources.getResources({
    scope,
    page,
    limit,
    sort,
    search,
    ids,
    tagIds,
    isActive,
    requestedFields,
  });

  return resources;
};
