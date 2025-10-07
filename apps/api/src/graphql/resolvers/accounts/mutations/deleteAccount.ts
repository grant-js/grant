import { MutationResolvers } from '@logusgraphics/grant-schema';

import { GraphqlContext } from '@/graphql/types';

export const deleteAccountResolver: MutationResolvers<GraphqlContext>['deleteAccount'] = async (
  _parent,
  { id },
  context
) => {
  const deletedAccount = await context.controllers.accounts.deleteAccount({ id });
  return deletedAccount;
};
