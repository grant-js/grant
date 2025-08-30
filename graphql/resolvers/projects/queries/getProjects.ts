import { QueryResolvers, Tenant } from '@/graphql/generated/types';
import { getDirectFieldSelection } from '@/graphql/lib/fieldSelection';
import { getScopedProjectIds } from '@/graphql/lib/scopeFiltering';

export const getProjectsResolver: QueryResolvers['projects'] = async (
  _parent,
  { organizationId, page, limit, sort, search, ids, tagIds },
  context,
  info
) => {
  const requestedFields = info ? getDirectFieldSelection(info, ['projects']) : undefined;

  const organizationProjects = await context.services.organizationProjects.getOrganizationProjects({
    organizationId,
  });
  const projectIds = organizationProjects.map((op) => op.projectId);

  if (projectIds.length === 0) {
    return {
      projects: [],
      totalCount: 0,
      hasNextPage: false,
    };
  }

  const scope = { tenant: Tenant.Organization, id: organizationId };
  const scopedProjectIds = await getScopedProjectIds({ context, scope });

  const filteredProjectIds = projectIds.filter((projectId) => scopedProjectIds.includes(projectId));

  if (filteredProjectIds.length === 0) {
    return {
      projects: [],
      totalCount: 0,
      hasNextPage: false,
    };
  }

  const projectsResult = await context.services.projects.getProjects({
    ids: filteredProjectIds,
    page,
    limit,
    sort,
    search,
    tagIds,
    requestedFields,
  });

  return projectsResult;
};
