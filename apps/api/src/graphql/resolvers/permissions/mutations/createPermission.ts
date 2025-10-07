import { MutationResolvers } from '@logusgraphics/grant-schema';

import { GraphqlContext } from '@/graphql/types';

export const createPermissionResolver: MutationResolvers<GraphqlContext>['createPermission'] =
  async (_parent, { input }, context) => {
    const createdPermission = await context.controllers.permissions.createPermission({ input });
    return createdPermission;
  };
