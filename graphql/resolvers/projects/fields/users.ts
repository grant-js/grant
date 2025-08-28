import { ProjectResolvers, Tenant } from '@/graphql/generated/types';
import { getDirectFieldSelection } from '@/graphql/lib/fieldSelection';
import { getScopedUserIds } from '@/graphql/lib/scopeFiltering';

export const projectUsersResolver: ProjectResolvers['users'] = async (
  parent,
  _args,
  context,
  info
) => {
  const projectId = parent.id;
  const requestedFields = info ? getDirectFieldSelection(info) : undefined;

  const projectUsers = await context.services.projectUsers.getProjectUsers({ projectId });
  const userIds = projectUsers.map((pu) => pu.userId);
  if (userIds.length === 0) {
    return [];
  }

  const scope = { tenant: Tenant.Project, id: projectId };
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
