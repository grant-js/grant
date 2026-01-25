import { QueryResolvers } from '@grantjs/schema';

import { GraphqlContext } from '@/graphql/types';

export const myUserAuthenticationMethodsResolver: QueryResolvers<GraphqlContext>['myUserAuthenticationMethods'] =
  async (_parent, _args, context) => {
    return await context.handlers.me.myUserAuthenticationMethods();
  };
