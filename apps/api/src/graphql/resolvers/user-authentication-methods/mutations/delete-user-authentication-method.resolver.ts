import { MutationResolvers } from '@logusgraphics/grant-schema';

import { GraphqlContext } from '@/graphql/types';
import { BadRequestError } from '@/lib/errors';

export const deleteUserAuthenticationMethodResolver: MutationResolvers<GraphqlContext>['deleteUserAuthenticationMethod'] =
  async (_parent, { input }, context) => {
    if (!context.user) {
      throw new BadRequestError('Authentication required', 'errors:auth.required');
    }

    return await context.handlers.users.deleteUserAuthenticationMethod(context.user.id, input.id);
  };
