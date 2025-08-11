import { ProjectPage, QueryProjectsArgs } from '@/graphql/generated/types';
import { getProjects as getProjectsFromStore } from '@/graphql/providers/projects/faker/dataStore';

const SEARCHABLE_FIELDS = ['name', 'slug', 'description'] as const;

export async function getProjects({
  page,
  limit,
  search,
  sort,
  ids,
}: QueryProjectsArgs): Promise<ProjectPage> {
  const safePage = typeof page === 'number' && page > 0 ? page : 1;
  const safeLimit = typeof limit === 'number' ? limit : 10;

  // Start with all projects or filter by IDs if provided
  let allProjects =
    ids && ids.length > 0
      ? getProjectsFromStore(sort || undefined, ids)
      : getProjectsFromStore(sort || undefined);

  // Filter by search term
  const filteredBySearchProjects = search
    ? allProjects.filter((project) =>
        SEARCHABLE_FIELDS.some((field) => {
          const value = project[field];
          return value && value.toLowerCase().includes(search.toLowerCase());
        })
      )
    : allProjects;

  const totalCount = filteredBySearchProjects.length;

  // If limit is 0 or negative, return all filtered results without pagination
  if (safeLimit <= 0) {
    return {
      projects: filteredBySearchProjects,
      totalCount,
      hasNextPage: false, // No pagination when limit is 0 or negative
    };
  }

  // Apply pagination for normal queries or when limit is specified
  const hasNextPage = safePage < Math.ceil(totalCount / safeLimit);
  const startIndex = (safePage - 1) * safeLimit;
  const endIndex = startIndex + safeLimit;
  const projects = filteredBySearchProjects.slice(startIndex, endIndex);

  return {
    projects,
    totalCount,
    hasNextPage,
  };
}
