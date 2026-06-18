import { MutationResolvers } from '@grantjs/schema';

import { GraphqlContext } from '@/graphql/types';
import { setRefreshTokenCookie } from '@/rest/utils/refresh-cookie';

export const register: MutationResolvers<GraphqlContext>['register'] = async (_, args, context) => {
  const { type, provider, providerId, providerData, emailVerificationProof } = args.input;
  const { locale, userAgent, ipAddress } = context;
  const result = await context.handlers.auth.register(
    {
      type,
      provider,
      providerId,
      providerData,
      emailVerificationProof,
    },
    locale,
    userAgent,
    ipAddress,
    context.requestLogger,
    context.requestBaseUrl
  );
  setRefreshTokenCookie(context.res, result.refreshToken);
  context.requestLogger.info({
    msg: 'User registered',
    accountId: result.account?.id,
  });
  return result;
};
