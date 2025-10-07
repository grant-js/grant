import { MutationResolvers } from '@logusgraphics/grant-schema';

import { GraphqlContext } from '@/graphql/types';

export const updatePermissionResolver: MutationResolvers<GraphqlContext>['updatePermission'] =
  async (_parent, { id, input }, context) => {
    const updatedPermission = await context.controllers.permissions.updatePermission({ id, input });
    return updatedPermission;
  };
