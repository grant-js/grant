import { UserResolvers } from '@logusgraphics/grant-schema';

import { GraphqlContext } from '@/graphql/types';

export const userAuthenticationMethodsResolver: UserResolvers<GraphqlContext>['authenticationMethods'] =
  async (parent, _args, context) => {
    const userId = parent.id;

    if (parent.authenticationMethods) {
      return parent.authenticationMethods;
    }

    return await context.handlers.users.getUserAuthenticationMethods({
      userId,
    });
  };
