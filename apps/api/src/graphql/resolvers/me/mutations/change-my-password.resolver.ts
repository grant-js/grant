import { MutationResolvers } from '@grantjs/schema';

import { GraphqlContext } from '@/graphql/types';

export const changeMyPasswordResolver: MutationResolvers<GraphqlContext>['changeMyPassword'] =
  async (_parent, { input }, context) => {
    await context.handlers.me.changeMyPassword({
      currentPassword: input.currentPassword,
      newPassword: input.newPassword,
    });

    return {
      success: true,
      message: 'Password changed successfully',
    };
  };
