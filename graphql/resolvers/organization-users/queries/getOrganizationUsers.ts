import { QueryResolvers } from '@/graphql/generated/types';

export const getOrganizationUsersResolver: QueryResolvers['organizationUsers'] = async (
  _parent,
  { organizationId },
  context
) => {
  const organizationUsers = await context.providers.organizationUsers.getOrganizationUsers({
    organizationId,
  });
  return organizationUsers;
};
