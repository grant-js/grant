import { MutationResolvers } from '@grantjs/schema';

import { GraphqlContext } from '@/graphql/types';

export const revokeMyUserSessionResolver: MutationResolvers<GraphqlContext>['revokeMyUserSession'] =
  async (_parent, { id }, context) => {
    await context.handlers.me.revokeMyUserSession(id);

    return {
      success: true,
      message: 'Session revoked successfully',
    };
  };
