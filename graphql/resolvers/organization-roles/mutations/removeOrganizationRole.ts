import { MutationResolvers } from '@/graphql/generated/types';

export const removeOrganizationRoleResolver: MutationResolvers['removeOrganizationRole'] = async (
  _parent,
  { input },
  context
) => {
  const removedOrganizationRole = await context.providers.organizationRoles.removeOrganizationRole({
    input,
  });
  return removedOrganizationRole;
};
