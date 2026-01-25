import { MutationResendVerificationArgs, MutationResolvers } from '@grantjs/schema';

import { GraphqlContext } from '@/graphql/types';

export const resendVerification: MutationResolvers<GraphqlContext>['resendVerification'] = async (
  _,
  args: MutationResendVerificationArgs,
  context: GraphqlContext
) => {
  return context.handlers.auth.resendVerificationEmail(args.input.email, context.locale);
};
