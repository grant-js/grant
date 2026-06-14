import { MutationResolvers } from '@grantjs/schema';

import { GraphqlContext } from '@/graphql/types';

export const assignUserPermissionResolver: MutationResolvers<GraphqlContext>['assignUserPermission'] =
  async (_parent, { input }, context) => {
    return context.handlers.users.assignUserPermission(input);
  };
