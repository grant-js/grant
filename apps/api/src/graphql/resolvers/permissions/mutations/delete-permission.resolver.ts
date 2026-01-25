import { MutationResolvers } from '@grantjs/schema';

import { GraphqlContext } from '@/graphql/types';

export const deletePermissionResolver: MutationResolvers<GraphqlContext>['deletePermission'] =
  async (_parent, { id, scope }, context) => {
    const deletedPermission = await context.handlers.permissions.deletePermission({ id, scope });
    return deletedPermission;
  };
