import { QueryResolvers } from '@grantjs/schema';

import { GraphqlContext } from '@/graphql/types';
import { authenticateGraphQLResolver } from '@/lib/authorization';

export const meResolver: QueryResolvers<GraphqlContext>['me'] = authenticateGraphQLResolver(
  async (_parent, _args, context) => {
    return await context.handlers.me.getMe();
  }
);
