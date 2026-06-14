import { MutationResolvers } from '@grantjs/schema';

import { GraphqlContext } from '@/graphql/types';

export const revokeRolePermissionResolver: MutationResolvers<GraphqlContext>['revokeRolePermission'] =
  async (_parent, { input }, context) => {
    return context.handlers.roles.revokeRolePermission(input);
  };
