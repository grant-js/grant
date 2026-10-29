import { MutationResolvers } from '@grantjs/schema';

import { GraphqlContext } from '@/graphql/types';

export const setProjectUserPasswordResolver: MutationResolvers<GraphqlContext>['setProjectUserPassword'] =
  async (_parent, { input }, context) => {
    return context.handlers.users.setProjectUserPassword({
      input,
    });
  };
