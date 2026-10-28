import { MutationResolvers } from '@grantjs/schema';

import { GraphqlContext } from '@/graphql/types';

export const setProjectUserEmailResolver: MutationResolvers<GraphqlContext>['setProjectUserEmail'] =
  async (_parent, { input }, context) => {
    return context.handlers.users.setProjectUserEmail({ input });
  };
