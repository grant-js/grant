import { MutationResolvers } from '@grantjs/schema';

import { GraphqlContext } from '@/graphql/types';
export const deleteUserResolver: MutationResolvers<GraphqlContext>['deleteUser'] = async (
  _parent,
  { id, scope },
  context
) => {
  const deletedUser = await context.handlers.users.deleteUser({ id, scope });
  return deletedUser;
};
