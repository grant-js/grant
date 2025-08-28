import { OrganizationResolvers } from '@/graphql/generated/types';
import { getDirectFieldSelection } from '@/graphql/lib/fieldSelection';

export const organizationProjectsResolver: OrganizationResolvers['projects'] = async (
  parent,
  _args,
  context,
  info
) => {
  const organizationId = parent.id;
  const requestedFields = info ? getDirectFieldSelection(info) : undefined;

  const organizationProjects = await context.services.organizationProjects.getOrganizationProjects({
    organizationId,
  });

  const projectIds = organizationProjects.map((op) => op.projectId);

  if (projectIds.length === 0) {
    return [];
  }

  const projectsResult = await context.services.projects.getProjects({
    ids: projectIds,
    organizationId,
    limit: -1,
    requestedFields,
  });

  return projectsResult.projects;
};
