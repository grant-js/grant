import { MutationResolvers } from '@grantjs/schema';

import { GraphqlContext } from '@/graphql/types';

export const upsertProjectOAuthConnectionResolver: MutationResolvers<GraphqlContext>['upsertProjectOAuthConnection'] =
  async (_parent, { input }, context) => {
    return context.handlers.projectOAuthConnections.upsertProjectOAuthConnection(input);
  };
