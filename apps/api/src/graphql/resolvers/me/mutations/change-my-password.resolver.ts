import { MutationResolvers } from '@grantjs/schema';

import { GraphqlContext } from '@/graphql/types';
import { t } from '@/i18n';

export const changeMyPasswordResolver: MutationResolvers<GraphqlContext>['changeMyPassword'] =
  async (_parent, { input }, context) => {
    await context.handlers.me.changeMyPassword({
      currentPassword: input.currentPassword,
      newPassword: input.newPassword,
    });

    return {
      success: true,
      message: t(context.req, 'common.success.passwordChanged'),
    };
  };
