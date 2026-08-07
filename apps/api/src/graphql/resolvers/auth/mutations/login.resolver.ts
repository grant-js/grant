import { MutationResolvers } from '@grantjs/schema';

import { GraphqlContext } from '@/graphql/types';
import { setRefreshTokenCookie } from '@/lib/refresh-cookie.lib';

export const login: MutationResolvers<GraphqlContext>['login'] = async (req, args, context) => {
  const result = await context.handlers.auth.login(
    args,
    context.userAgent,
    context.ipAddress,
    context.requestBaseUrl
  );
  setRefreshTokenCookie(context.res, result.refreshToken);
  return result;
};
