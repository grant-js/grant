import { Account, QueryResolvers } from '@logusgraphics/grant-schema';

import { getDirectFieldSelection } from '@/graphql/lib/fieldSelection';
import { GraphqlContext } from '@/graphql/types';

export const getAccountsResolver: QueryResolvers<GraphqlContext>['accounts'] = async (
  _parent,
  { page, limit, sort, search, ids },
  context,
  info
) => {
  const requestedFields = getDirectFieldSelection<keyof Account>(info, ['accounts']);
  const accounts = await context.controllers.accounts.getAccounts({
    page,
    limit,
    sort,
    search,
    ids,
    requestedFields,
  });
  return accounts;
};
