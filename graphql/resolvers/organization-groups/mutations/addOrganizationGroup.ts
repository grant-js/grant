import { MutationResolvers } from '@/graphql/generated/types';

export const addOrganizationGroupResolver: MutationResolvers['addOrganizationGroup'] = async (
  _parent,
  { input },
  context
) => {
  const organizationGroup = await context.providers.organizationGroups.addOrganizationGroup({
    input,
  });
  return organizationGroup;
};
