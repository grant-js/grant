import { QueryResolvers } from '@grantjs/schema';

import { GraphqlContext } from '@/graphql/types';

export const myProjectMembershipsResolver: QueryResolvers<GraphqlContext>['myProjectMemberships'] =
  async (_parent, _args, context) => {
    return await context.handlers.me.myProjectMemberships();
  };
