import { MutationResolvers } from '@logusgraphics/grant-schema';

import { GraphqlContext } from '@/graphql/types';

export const updateAccountResolver: MutationResolvers<GraphqlContext>['updateAccount'] = async (
  _parent,
  { id, input },
  context
) => {
  const updatedAccount = await context.controllers.accounts.updateAccount({ id, input });
  return updatedAccount;
};
