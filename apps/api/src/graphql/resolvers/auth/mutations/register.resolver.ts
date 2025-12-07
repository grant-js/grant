import { MutationResolvers } from '@logusgraphics/grant-schema';

import { GraphqlContext } from '@/graphql/types';

export const register: MutationResolvers<GraphqlContext>['register'] = async (_, args, context) => {
  const { type, provider, providerId, providerData } = args.input;
  const { locale, userAgent, ipAddress } = context;
  return context.handlers.accounts.createAccount(
    {
      type,
      provider,
      providerId,
      providerData,
    },
    locale,
    userAgent,
    ipAddress
  );
};
