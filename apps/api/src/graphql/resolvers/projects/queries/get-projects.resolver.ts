import { ProjectModel } from '@grantjs/database';
import { QueryResolvers } from '@grantjs/schema';

import { GraphqlContext } from '@/graphql/types';
import { getDirectFieldSelection } from '@/lib/field-selection.lib';

export const getProjects: QueryResolvers<GraphqlContext>['projects'] = async (
  _parent,
  { scope, page, limit, sort, search, ids, tagIds },
  context,
  info
) => {
  const requestedFields = getDirectFieldSelection<keyof ProjectModel>(info, ['projects']);
  return await context.handlers.projects.getProjects({
    scope,
    page,
    limit,
    sort,
    search,
    ids,
    tagIds,
    requestedFields,
  });
};
