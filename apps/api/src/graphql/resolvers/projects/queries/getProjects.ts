import { ProjectModel } from '@logusgraphics/grant-database';
import { QueryResolvers } from '@logusgraphics/grant-schema';

import { getDirectFieldSelection } from '@/graphql/lib/fieldSelection';
import { GraphqlContext } from '@/graphql/types';

export const getProjectsResolver: QueryResolvers<GraphqlContext>['projects'] = async (
  _parent,
  { scope, page, limit, sort, search, ids, tagIds },
  context,
  info
) => {
  const requestedFields = getDirectFieldSelection<keyof ProjectModel>(info, ['projects']);
  return await context.controllers.projects.getProjects({
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
