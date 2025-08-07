import { MutationResolvers } from '@/graphql/generated/types';

export const addOrganizationRoleResolver: MutationResolvers['addOrganizationRole'] = async (
  _parent,
  { input },
  context
) => {
  const organizationRole = await context.providers.organizationRoles.addOrganizationRole(input);
  return organizationRole;
};
