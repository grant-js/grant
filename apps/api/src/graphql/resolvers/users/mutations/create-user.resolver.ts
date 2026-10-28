import { MutationResolvers } from '@grantjs/schema';

import { GraphqlContext } from '@/graphql/types';
import { AuthenticationError } from '@/lib/errors';

export const createUserResolver: MutationResolvers<GraphqlContext>['createUser'] = async (
  _parent,
  { input },
  context
) => {
  const actorUserId = context.user?.userId;
  if (input.email !== undefined && input.email !== null && !actorUserId) {
    throw new AuthenticationError('Authentication required');
  }
  const createdUser = await context.handlers.users.createUser({ input, actorUserId });
  return createdUser;
};
