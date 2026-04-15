import { MutationResolvers } from '@grantjs/schema';

import { GraphqlContext } from '@/graphql/types';

export const syncProjectPermissionsResolver: MutationResolvers<GraphqlContext>['syncProjectPermissions'] =
  async (_parent, args, context) => {
    return await context.handlers.projects.syncProjectPermissions(args);
  };
