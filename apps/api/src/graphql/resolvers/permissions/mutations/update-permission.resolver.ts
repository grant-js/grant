import { MutationResolvers } from '@grantjs/schema';

import { GraphqlContext } from '@/graphql/types';

export const updatePermissionResolver: MutationResolvers<GraphqlContext>['updatePermission'] =
  async (_parent, { id, input }, context) => {
    const updatedPermission = await context.handlers.permissions.updatePermission({ id, input });
    return updatedPermission;
  };
