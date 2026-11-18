import { MutationResolvers } from '@grantjs/schema';

import { GraphqlContext } from '@/graphql/types';

export const linkProjectUserIdentityResolver: MutationResolvers<GraphqlContext>['linkProjectUserIdentity'] =
  async (_parent, { input }, context) => {
    return context.handlers.users.linkProjectUserIdentity({ input });
  };
