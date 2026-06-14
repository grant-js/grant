import { MutationResolvers } from '@grantjs/schema';

import { GraphqlContext } from '@/graphql/types';

export const revokeUserPermissionResolver: MutationResolvers<GraphqlContext>['revokeUserPermission'] =
  async (_parent, { input }, context) => {
    return context.handlers.users.revokeUserPermission(input);
  };
