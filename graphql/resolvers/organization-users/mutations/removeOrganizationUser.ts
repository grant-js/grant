import { MutationResolvers } from '@/graphql/generated/types';

export const removeOrganizationUserResolver: MutationResolvers['removeOrganizationUser'] = async (
  _parent,
  { input },
  context
) => {
  const removedOrganizationUser = await context.providers.organizationUsers.removeOrganizationUser({
    input,
  });
  return removedOrganizationUser;
};
