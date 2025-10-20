import { MutationResolvers, MutationVerifyEmailArgs } from '@logusgraphics/grant-schema';

import { GraphqlContext } from '@/graphql/types';

export const verifyEmail: MutationResolvers<GraphqlContext>['verifyEmail'] = async (
  _,
  args: MutationVerifyEmailArgs,
  context: GraphqlContext
) => {
  return context.handlers.accounts.verifyEmail(args.input.token, context.locale);
};
