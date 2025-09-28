import { MutationResolvers } from '@/graphql/generated/types';

export const login: MutationResolvers['login'] = async (_, args, context) => {
  return context.controllers.accounts.login(args);
};
