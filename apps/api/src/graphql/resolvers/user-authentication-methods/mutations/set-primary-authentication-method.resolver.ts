import { MutationResolvers } from '@logusgraphics/grant-schema';

import { GraphqlContext } from '@/graphql/types';
import { BadRequestError } from '@/lib/errors';

export const setPrimaryAuthenticationMethodResolver: MutationResolvers<GraphqlContext>['setPrimaryAuthenticationMethod'] =
  async (_parent, { id }, context) => {
    if (!context.user) {
      throw new BadRequestError('Authentication required', 'errors:auth.required');
    }

    return await context.handlers.users.setPrimaryAuthenticationMethod(context.user.id, id);
  };
