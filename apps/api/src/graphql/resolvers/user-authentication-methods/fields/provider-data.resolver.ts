import { UserAuthenticationMethodResolvers } from '@grantjs/schema';

import { GraphqlContext } from '@/graphql/types';
import { redactAuthMethodProviderData } from '@/lib/auth-method-public.lib';

export const userAuthenticationMethodProviderDataResolver: UserAuthenticationMethodResolvers<GraphqlContext>['providerData'] =
  (parent) => redactAuthMethodProviderData(parent.providerData);
