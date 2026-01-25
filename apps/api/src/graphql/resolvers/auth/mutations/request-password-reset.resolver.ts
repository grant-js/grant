import { MutationRequestPasswordResetArgs, MutationResolvers } from '@grantjs/schema';

import { GraphqlContext } from '@/graphql/types';

export const requestPasswordReset: MutationResolvers<GraphqlContext>['requestPasswordReset'] =
  async (_, args: MutationRequestPasswordResetArgs, context: GraphqlContext) => {
    return context.handlers.auth.requestPasswordReset(args.input.email, context.locale);
  };
