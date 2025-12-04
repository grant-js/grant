import { QueryResolvers } from '@logusgraphics/grant-schema';

import { GraphqlContext } from '@/graphql/types';
import { AuthenticationError } from '@/lib/errors';

export const me: QueryResolvers<GraphqlContext>['me'] = async (_parent, _args, context) => {
  if (!context.user) {
    throw new AuthenticationError('Authentication required', 'errors:auth.required');
  }

  return context.handlers.accounts.getMe(context.user.id);
};
