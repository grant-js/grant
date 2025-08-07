import { MutationResolvers } from '@/graphql/generated/types';

export const removeOrganizationGroupResolver: MutationResolvers['removeOrganizationGroup'] = async (
  _parent,
  { input },
  context
) => {
  const success = await context.providers.organizationGroups.removeOrganizationGroup({
    input,
  });
  return success;
};
