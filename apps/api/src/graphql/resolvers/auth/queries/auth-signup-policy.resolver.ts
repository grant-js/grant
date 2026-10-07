import { QueryResolvers } from '@grantjs/schema';

import { GraphqlContext } from '@/graphql/types';

export const authSignupPolicyResolver: QueryResolvers<GraphqlContext>['authSignupPolicy'] = async (
  _parent,
  _args,
  context
) => context.handlers.auth.getSignupPolicy();
