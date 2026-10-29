import { QueryResolvers } from '@grantjs/schema';

import { GraphqlContext } from '@/graphql/types';

export const exportProjectUserCredentialsResolver: QueryResolvers<GraphqlContext>['exportProjectUserCredentials'] =
  async (_parent, { input }, context) => {
    return context.handlers.users.exportProjectUserCredentials({
      input,
    });
  };
