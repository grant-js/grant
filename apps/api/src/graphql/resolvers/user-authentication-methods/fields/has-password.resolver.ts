import { UserAuthenticationMethodResolvers } from '@grantjs/schema';

import { GraphqlContext } from '@/graphql/types';

/**
 * `hasPassword` is "a platform credential exists" (ADR 0011), not a property of the stored
 * row: the handler that returns the method sets it. Anything that did not is `false`.
 */
export const userAuthenticationMethodHasPasswordResolver: UserAuthenticationMethodResolvers<GraphqlContext>['hasPassword'] =
  (parent) => parent.hasPassword === true;
