import { RoleResolvers } from '@/graphql/generated/types';

export const roleGroupsResolver: RoleResolvers['groups'] = async (parent, _args, context) => {
  const roleId = parent.id;

  if (parent.groups) {
    return parent.groups;
  }

  return await context.controllers.roles.getRoleGroups({
    roleId,
    requestedFields: ['groups'],
  });
};
