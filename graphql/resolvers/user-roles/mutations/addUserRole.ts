import { MutationResolvers } from '@/graphql/generated/types';

export const addUserRoleResolver: MutationResolvers['addUserRole'] = async (
  _parent,
  { input },
  context
) => {
  const addedUserRole = await context.providers.userRoles.addUserRole({ input });
  return addedUserRole;
};
