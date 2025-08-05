import { getProjects as getProjectsFromStore } from '@/graphql/providers/projects/faker/dataStore';
import { GetProjectsParams, GetProjectsResult } from '@/graphql/providers/projects/types';

export async function getProjects({
  page,
  limit,
  search,
  sort,
  ids,
}: GetProjectsParams): Promise<GetProjectsResult> {
  // Get all projects from the store
  let projects = getProjectsFromStore(sort || undefined);

  // Apply ID filter if provided
  if (ids && ids.length > 0) {
    projects = projects.filter((project) => ids.includes(project.id));
  }

  // Apply search filter if provided
  if (search) {
    projects = projects.filter(
      (project) =>
        project.name.toLowerCase().includes(search.toLowerCase()) ||
        project.slug.toLowerCase().includes(search.toLowerCase()) ||
        (project.description && project.description.toLowerCase().includes(search.toLowerCase()))
    );
  }

  // Calculate pagination
  const totalCount = projects.length;
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  const paginatedProjects = projects.slice(startIndex, endIndex);

  // Check if there are more pages
  const hasNextPage = endIndex < totalCount;

  return {
    projects: paginatedProjects,
    totalCount,
    hasNextPage,
  };
}
