import { MutationResolvers } from '@grantjs/schema';

import { GraphqlContext } from '@/graphql/types';

export const clearProjectOAuthConnectionResolver: MutationResolvers<GraphqlContext>['clearProjectOAuthConnection'] =
  async (_parent, { input }, context) => {
    return context.handlers.projectOAuthConnections.clearProjectOAuthConnection(input);
  };
