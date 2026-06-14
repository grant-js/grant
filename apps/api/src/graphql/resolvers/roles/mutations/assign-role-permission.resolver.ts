import { MutationResolvers } from '@grantjs/schema';

import { GraphqlContext } from '@/graphql/types';

export const assignRolePermissionResolver: MutationResolvers<GraphqlContext>['assignRolePermission'] =
  async (_parent, { input }, context) => {
    return context.handlers.roles.assignRolePermission(input);
  };
