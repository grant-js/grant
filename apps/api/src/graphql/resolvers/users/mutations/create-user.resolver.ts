import { MutationResolvers } from '@grantjs/schema';

import { GraphqlContext } from '@/graphql/types';
export const createUserResolver: MutationResolvers<GraphqlContext>['createUser'] = async (
  _parent,
  { input },
  context
) => {
  const createdUser = await context.handlers.users.createUser({ input });
  return createdUser;
};
