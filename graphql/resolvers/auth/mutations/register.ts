import { MutationResolvers } from '@/graphql/generated/types';

export const register: MutationResolvers['register'] = async (_, args, context) => {
  const { name, type, provider, providerId, providerData } = args.input;

  return context.controllers.accounts.createAccount({
    name,
    type,
    provider,
    providerId,
    providerData,
  });
};
