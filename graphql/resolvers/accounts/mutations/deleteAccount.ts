import { MutationResolvers } from '@/graphql/generated/types';

export const deleteAccountResolver: MutationResolvers['deleteAccount'] = async (
  _parent,
  { id },
  context
) => {
  const deletedAccount = await context.controllers.accounts.deleteAccount({ id });
  return deletedAccount;
};
