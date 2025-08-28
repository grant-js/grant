import { OrganizationResolvers, Tenant } from '@/graphql/generated/types';
import { getDirectFieldSelection } from '@/graphql/lib/fieldSelection';
import { getScopedUserIds } from '@/graphql/lib/scopeFiltering';

export const organizationUsersResolver: OrganizationResolvers['users'] = async (
  parent,
  _args,
  context,
  info
) => {
  const organizationId = parent.id;
  const requestedFields = info ? getDirectFieldSelection(info) : undefined;

  const organizationUsers = await context.services.organizationUsers.getOrganizationUsers({
    organizationId,
  });
  const userIds = organizationUsers.map((ou) => ou.userId);
  if (userIds.length === 0) {
    return [];
  }

  const scope = { tenant: Tenant.Organization, id: organizationId };
  const scopedUserIds = await getScopedUserIds({ scope, context });

  const filteredUserIds = userIds.filter((userId) => scopedUserIds.includes(userId));

  if (filteredUserIds.length === 0) {
    return [];
  }

  const usersResult = await context.services.users.getUsers({
    ids: filteredUserIds,
    limit: -1,
    requestedFields,
  });
  return usersResult.users;
};
