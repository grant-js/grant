import { QueryResolvers } from '@grantjs/schema';

import { GraphqlContext } from '@/graphql/types';

export const myUserSessionsResolver: QueryResolvers<GraphqlContext>['myUserSessions'] = async (
  _parent,
  { input },
  context
) => {
  return await context.handlers.me.myUserSessions(input);
};
