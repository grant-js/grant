import { UserResolvers } from '@/graphql/generated/types';

export const userRolesResolver: UserResolvers['roles'] = async (parent, _args, context) => {
  const userId = parent.id;

  if (parent.roles) {
    return parent.roles;
  }

  return await context.controllers.users.getUserRoles({
    userId,
    requestedFields: ['roles'],
  });
};
