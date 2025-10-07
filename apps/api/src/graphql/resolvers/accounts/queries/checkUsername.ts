import { QueryResolvers } from '@logusgraphics/grant-schema';

import { GraphqlContext } from '@/graphql/types';

export const checkUsernameResolver: QueryResolvers<GraphqlContext>['checkUsername'] = async (
  _,
  args,
  context
) => {
  const { username } = args;

  return context.controllers.accounts.checkUsername(username);
};
