import { MutationResolvers } from '@logusgraphics/grant-schema';

import { GraphqlContext } from '@/graphql/types';
export const createUserResolver: MutationResolvers<GraphqlContext>['createUser'] = async (
  _parent,
  { input },
  context
) => {
  const createdUser = await context.controllers.users.createUser({ input });
  return createdUser;
};
