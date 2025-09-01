import { QueryResolvers } from '@/graphql/generated/types';
import { getDirectFieldSelection } from '@/graphql/lib/fieldSelection';
import { ProjectModel } from '@/graphql/repositories/projects/schema';

export const getProjectsResolver: QueryResolvers['projects'] = async (
  _parent,
  { organizationId, page, limit, sort, search, ids, tagIds },
  context,
  info
) => {
  const requestedFields = getDirectFieldSelection<keyof ProjectModel>(info, ['projects']);

  return await context.controllers.projects.getProjects({
    organizationId,
    page,
    limit,
    sort,
    search,
    ids,
    tagIds,
    requestedFields,
  });
};
