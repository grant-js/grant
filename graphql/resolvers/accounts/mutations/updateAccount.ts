import { MutationResolvers } from '@/graphql/generated/types';

export const updateAccountResolver: MutationResolvers['updateAccount'] = async (
  _parent,
  { id, input },
  context
) => {
  const updatedAccount = await context.controllers.accounts.updateAccount({ id, input });
  return updatedAccount;
};
