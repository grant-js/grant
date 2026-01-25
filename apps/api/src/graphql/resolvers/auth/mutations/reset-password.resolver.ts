import { MutationResetPasswordArgs, MutationResolvers } from '@grantjs/schema';

import { GraphqlContext } from '@/graphql/types';

export const resetPassword: MutationResolvers<GraphqlContext>['resetPassword'] = async (
  _,
  args: MutationResetPasswordArgs,
  context: GraphqlContext
) => {
  return context.handlers.auth.resetPassword(
    args.input.token,
    args.input.newPassword,
    context.locale
  );
};
