import { QueryResolvers } from '@logusgraphics/grant-schema';

import { GraphqlContext } from '@/graphql/types';
import { BadRequestError } from '@/lib/errors';

export const getUserAuthenticationMethodsResolver: QueryResolvers<GraphqlContext>['userAuthenticationMethods'] =
  async (_parent, { input }, context) => {
    if (!context.user) {
      throw new BadRequestError('Authentication required', 'errors:auth.required');
    }

    const userId = input.userId || context.user.id;

    if (userId !== context.user.id) {
      throw new BadRequestError(
        'You can only query your own authentication methods',
        'errors:auth.unauthorized'
      );
    }

    const methods = await context.handlers.users.getUserAuthenticationMethods({
      userId,
      provider: input.provider || undefined,
    });

    return methods;
  };
