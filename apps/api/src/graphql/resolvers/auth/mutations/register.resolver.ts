import { MutationResolvers } from '@grantjs/schema';

import { GraphqlContext } from '@/graphql/types';
import { assertEmailProviderForDirectAuth } from '@/lib/oauth-direct-auth.lib';
import { setRefreshTokenCookie } from '@/lib/refresh-cookie.lib';

export const register: MutationResolvers<GraphqlContext>['register'] = async (_, args, context) => {
  const { type, provider, providerId, providerData, emailVerificationProof } = args.input;
  assertEmailProviderForDirectAuth(provider);
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
