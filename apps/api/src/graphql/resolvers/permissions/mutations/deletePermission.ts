import { MutationResolvers } from '@logusgraphics/grant-schema';

import { GraphqlContext } from '@/graphql/types';

export const deletePermissionResolver: MutationResolvers<GraphqlContext>['deletePermission'] =
  async (_parent, { id, scope }, context) => {
    const deletedPermission = await context.controllers.permissions.deletePermission({ id, scope });
    return deletedPermission;
  };
