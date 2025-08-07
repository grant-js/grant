import { OrganizationResolvers } from '@/graphql/generated/types';

export const organizationUsersResolver: OrganizationResolvers['users'] = async (
  parent,
  _args,
  context
) => {
  // Get organization-user relationships for this organization
  const organizationUsers = await context.providers.organizationUsers.getOrganizationUsers({
    organizationId: parent.id,
  });

  // Extract user IDs from organization-user relationships
  const userIds = organizationUsers.map((ou) => ou.userId);

  if (userIds.length === 0) {
    return [];
  }

  // Get users by IDs (optimized - no need to fetch all users)
  const usersResult = await context.providers.users.getUsers({
    ids: userIds,
  });

  return usersResult.users;
};
