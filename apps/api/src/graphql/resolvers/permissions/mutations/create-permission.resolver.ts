import { MutationResolvers } from '@grantjs/schema';

import { GraphqlContext } from '@/graphql/types';

export const createPermissionResolver: MutationResolvers<GraphqlContext>['createPermission'] =
  async (_parent, { input }, context) => {
    const createdPermission = await context.handlers.permissions.createPermission({ input });
    return createdPermission;
  };
