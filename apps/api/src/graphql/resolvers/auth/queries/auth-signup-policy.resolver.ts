import { QueryResolvers } from '@grantjs/schema';

import { config } from '@/config';
import { GraphqlContext } from '@/graphql/types';

export const authSignupPolicyResolver: QueryResolvers<GraphqlContext>['authSignupPolicy'] =
  async () => ({
    publicSignupEnabled: config.auth.publicSignupEnabled,
    bootstrapOpen: false,
  });
