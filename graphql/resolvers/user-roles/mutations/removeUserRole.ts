import { MutationResolvers } from '@/graphql/generated/types';

export const removeUserRoleResolver: MutationResolvers['removeUserRole'] = async (
  _parent,
  { input },
  context
) => {
  const removedUserRole = await context.providers.userRoles.removeUserRole({ input });
  return removedUserRole;
};
