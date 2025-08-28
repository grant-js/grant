import { ProjectResolvers, Tenant } from '@/graphql/generated/types';
import { getDirectFieldSelection } from '@/graphql/lib/fieldSelection';
import { getScopedGroupIds } from '@/graphql/lib/scopeFiltering';

export const projectGroupsResolver: ProjectResolvers['groups'] = async (
  parent,
  _args,
  context,
  info
) => {
  const projectId = parent.id;
  const requestedFields = info ? getDirectFieldSelection(info) : undefined;

  const projectGroups = await context.services.projectGroups.getProjectGroups({
    projectId,
  });

  const groupIds = projectGroups.map((pg) => pg.groupId);

  if (groupIds.length === 0) {
    return [];
  }

  const scope = { tenant: Tenant.Project, id: projectId };
  const scopedGroupIds = await getScopedGroupIds({ scope, context });

  const filteredGroupIds = groupIds.filter((groupId) => scopedGroupIds.includes(groupId));

  if (filteredGroupIds.length === 0) {
    return [];
  }

  const groupsResult = await context.services.groups.getGroups({
    ids: filteredGroupIds,
    limit: -1,
    requestedFields,
  });

  return groupsResult.groups;
};
