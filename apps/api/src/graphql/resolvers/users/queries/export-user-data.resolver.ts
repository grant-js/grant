import { QueryResolvers } from '@logusgraphics/grant-schema';

import { GraphqlContext } from '@/graphql/types';
import { AuthenticationError } from '@/lib/errors';

export const exportUserDataResolver: QueryResolvers<GraphqlContext>['exportUserData'] = async (
  _parent,
  _args,
  context
) => {
  const userId = context.user?.id;
  if (!userId) {
    throw new AuthenticationError('Authentication required', 'errors:auth.unauthorized');
  }

  return await context.handlers.users.exportUserData(userId);
};
