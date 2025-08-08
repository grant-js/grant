import { QueryResolvers } from '@/graphql/generated/types';

export const getUserRolesResolver: QueryResolvers['userRoles'] = async (
  _parent,
  { userId, scope },
  context
) => {
  const userRoles = await context.providers.userRoles.getUserRoles({
    userId,
    scope,
  });
  return userRoles;
};
