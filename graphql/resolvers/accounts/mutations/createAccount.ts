import { MutationResolvers } from '@/graphql/generated/types';

export const createAccountResolver: MutationResolvers['createAccount'] = async (
  _parent,
  { input },
  context
) => {
  const { name, type, provider, providerId, providerData } = input;
  const createdAccount = await context.controllers.accounts.createAccount({
    name,
    type,
    provider,
    providerId,
    providerData,
  });
  return createdAccount;
};
