import { MutationResolvers } from '@grantjs/schema';

import { GraphqlContext } from '@/graphql/types';
import { AuthenticationError } from '@/lib/errors';
import { getRefreshTokenFromCookie } from '@/lib/headers.lib';
import { clearRefreshTokenCookie, setRefreshTokenCookie } from '@/rest/utils/refresh-cookie';

/**
 * Cookie-based refresh only (aligns with REST POST /api/auth/refresh).
 */
export const refreshSession: MutationResolvers<GraphqlContext>['refreshSession'] = async (
  _,
  _args,
  context: GraphqlContext
) => {
  const refreshTokenFromCookie = getRefreshTokenFromCookie(context.req);
  if (!refreshTokenFromCookie) {
    clearRefreshTokenCookie(context.res);
    throw new AuthenticationError('Invalid or expired refresh token');
  }
  try {
    const result = await context.handlers.auth.refreshSession(
      refreshTokenFromCookie,
      context.userAgent,
      context.ipAddress
    );
    setRefreshTokenCookie(context.res, result.refreshToken);
    return result;
  } catch (err) {
    clearRefreshTokenCookie(context.res);
    if (err instanceof AuthenticationError) throw err;
    throw new AuthenticationError('Invalid or expired refresh token');
  }
};
