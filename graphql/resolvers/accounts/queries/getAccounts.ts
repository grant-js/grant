import { Account, QueryResolvers } from '@/graphql/generated/types';
import { getDirectFieldSelection } from '@/graphql/lib/fieldSelection';

export const getAccountsResolver: QueryResolvers['accounts'] = async (
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
