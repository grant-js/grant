import { QueryResolvers } from '@/graphql/generated/types';

export const getProjectsResolver: QueryResolvers['projects'] = async (
  _parent,
  { page = 1, limit = 10, sort, search, ids },
  context
) => {
  const projects = await context.providers.projects.getProjects({
    limit,
    page,
    sort,
    search,
    ids,
  });
  return projects;
};
