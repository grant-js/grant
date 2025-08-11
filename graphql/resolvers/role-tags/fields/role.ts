import { RoleTagResolvers } from '@/graphql/generated/types';

export const roleTagRoleResolver: RoleTagResolvers['role'] = async (parent, { scope }, context) => {
  const rolesResult = await context.providers.roles.getRoles({
    ids: [parent.roleId],
    scope,
  });

  const role = rolesResult.roles[0];

  if (!role) {
    throw new Error(`Role with ID ${parent.roleId} not found`);
  }

  return role;
};
