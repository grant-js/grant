import { MutationResolvers } from '@/graphql/generated/types';

export const removeOrganizationRoleResolver: MutationResolvers['removeOrganizationRole'] = async (
  _parent,
  { input },
  context
) => {
  const success = await context.providers.organizationRoles.removeOrganizationRole(input);
  return success;
};
