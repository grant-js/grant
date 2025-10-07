import { MutationResolvers } from '@logusgraphics/grant-schema';

import { GraphqlContext } from '@/graphql/types';
export const deleteUserResolver: MutationResolvers<GraphqlContext>['deleteUser'] = async (
  _parent,
  { id, scope },
  context
) => {
  const deletedUser = await context.controllers.users.deleteUser({ id, scope });
  return deletedUser;
};
