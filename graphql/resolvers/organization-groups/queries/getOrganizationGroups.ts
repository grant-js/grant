import { QueryResolvers } from '@/graphql/generated/types';

export const getOrganizationGroupsResolver: QueryResolvers['organizationGroups'] = async (
  _parent,
  { organizationId },
  context
) => {
  const organizationGroups = await context.providers.organizationGroups.getOrganizationGroups({
    organizationId,
  });
  return organizationGroups;
};
