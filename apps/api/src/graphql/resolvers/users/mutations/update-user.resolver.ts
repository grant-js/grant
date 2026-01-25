import { MutationResolvers } from '@grantjs/schema';

import { GraphqlContext } from '@/graphql/types';
export const updateUserResolver: MutationResolvers<GraphqlContext>['updateUser'] = async (
  _parent,
  { id, input },
  context
) => {
  const updatedUser = await context.handlers.users.updateUser({ id, input });
  return updatedUser;
};
