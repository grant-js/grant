import { QueryResolvers } from '@grantjs/schema';

import { GraphqlContext } from '@/graphql/types';

export const getProjectOAuthConnectionsResolver: QueryResolvers<GraphqlContext>['projectOAuthConnections'] =
  async (_parent, { scope }, context) => {
    return context.handlers.projectOAuthConnections.getProjectOAuthConnections(scope);
  };
