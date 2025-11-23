import { MutationResolvers } from '@logusgraphics/grant-schema';

import { GraphqlContext } from '@/graphql/types';
import { AuthorizationError } from '@/lib/errors';

export const deleteAccountResolver: MutationResolvers<GraphqlContext>['deleteAccount'] = async (
  _parent,
  { input },
  context
) => {
  const { userId } = input;

  if (context.user?.id !== userId) {
    throw new AuthorizationError('You can only delete your own account', 'errors:auth.forbidden');
  }

  const deletedUser = await context.handlers.accounts.deleteAccount({
    input,
  });

  return deletedUser;
};
