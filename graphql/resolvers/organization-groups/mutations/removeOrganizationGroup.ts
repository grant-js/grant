import { MutationResolvers } from '@/graphql/generated/types';

export const removeOrganizationGroupResolver: MutationResolvers['removeOrganizationGroup'] = async (
  _parent,
  { input },
  context
) => {
  const removedOrganizationGroup =
    await context.providers.organizationGroups.removeOrganizationGroup({
      input,
    });
  return removedOrganizationGroup;
};
