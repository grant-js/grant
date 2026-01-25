import { MutationResolvers, MutationVerifyEmailArgs } from '@grantjs/schema';

import { GraphqlContext } from '@/graphql/types';

export const verifyEmail: MutationResolvers<GraphqlContext>['verifyEmail'] = async (
  _,
  args: MutationVerifyEmailArgs,
  context: GraphqlContext
) => {
  return context.handlers.auth.verifyEmail(args.input.token, context.locale);
};
