import { RoleResolvers } from '@/graphql/generated/types';
import { getDirectFieldSelection } from '@/graphql/lib/fieldSelection';
import { getScopedGroupIds } from '@/graphql/lib/scopeFiltering';

export const roleGroupsResolver: RoleResolvers['groups'] = async (
  parent,
  { scope },
  context,
  info
) => {
  const requestedFields = info ? getDirectFieldSelection(info) : undefined;

  const groups = await context.services.roleGroups.getRoleGroups({
    roleId: parent.id,
  });

  const groupIds = groups.map((g) => g.groupId);

  if (groupIds.length === 0) {
    return [];
  }

  const scopedGroupIds = await getScopedGroupIds({ scope, context });
  const accessibleGroupIds = groupIds.filter((id) => scopedGroupIds.includes(id));

  if (accessibleGroupIds.length === 0) {
    return [];
  }

  const groupsResult = await context.services.groups.getGroups({
    ids: accessibleGroupIds,
    limit: -1,
    requestedFields,
  });

  return groupsResult.groups;
};
