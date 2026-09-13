import { UserAuthenticationMethodResolvers } from '@grantjs/schema';

import { GraphqlContext } from '@/graphql/types';
import { authMethodHasPassword } from '@/lib/auth-method-public.lib';

export const userAuthenticationMethodHasPasswordResolver: UserAuthenticationMethodResolvers<GraphqlContext>['hasPassword'] =
  (parent) => {
    if (typeof parent.hasPassword === 'boolean') {
      return parent.hasPassword;
    }
    return authMethodHasPassword(parent);
  };
