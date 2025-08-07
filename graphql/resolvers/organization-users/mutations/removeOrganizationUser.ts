import { MutationResolvers } from '@/graphql/generated/types';

export const removeOrganizationUserResolver: MutationResolvers['removeOrganizationUser'] = async (
  _parent,
  { input },
  context
) => {
  const success = await context.providers.organizationUsers.removeOrganizationUser({
    input,
  });
  return success;
};
