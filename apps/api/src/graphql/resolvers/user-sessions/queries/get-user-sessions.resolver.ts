import { QueryResolvers } from '@logusgraphics/grant-schema';

import { GraphqlContext } from '@/graphql/types';
import { BadRequestError } from '@/lib/errors';

export const getUserSessionsResolver: QueryResolvers<GraphqlContext>['userSessions'] = async (
  _parent,
  { input },
  context
) => {
  if (!context.user) {
    throw new BadRequestError('Authentication required', 'errors:auth.required');
  }

  const userId = input.userId || context.user.id;

  if (userId !== context.user.id) {
    throw new BadRequestError('You can only query your own sessions', 'errors:auth.unauthorized');
  }

  const result = await context.handlers.users.getUserSessions({
    userId,
    audience: input.audience,
    page: input.page,
    limit: input.limit,
  });

  return result;
};
