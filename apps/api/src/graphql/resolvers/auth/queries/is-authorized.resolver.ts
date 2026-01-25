import { QueryResolvers } from '@grantjs/schema';

import { GraphqlContext } from '@/graphql/types';

export const isAuthorizedResolver: QueryResolvers<GraphqlContext>['isAuthorized'] = async (
  _parent,
  { input },
  context
) => {
  return context.handlers.auth.isAuthorized(input);
};
