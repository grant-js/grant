import { OrganizationResolvers } from '@/graphql/generated/types';

export const organizationGroupsResolver: OrganizationResolvers['groups'] = async (
  parent,
  _args,
  context
) => {
  // Get organization-group relationships for this organization
  const organizationGroups = await context.providers.organizationGroups.getOrganizationGroups({
    organizationId: parent.id,
  });

  // Extract group IDs from organization-group relationships
  const groupIds = organizationGroups.map((og) => og.groupId);

  if (groupIds.length === 0) {
    return [];
  }

  // Get groups by IDs (optimized - no need to fetch all groups)
  const groupsResult = await context.providers.groups.getGroups({
    ids: groupIds,
  });

  return groupsResult.groups;
};
