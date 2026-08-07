import { MutationResolvers } from '@grantjs/schema';

import { GraphqlContext } from '@/graphql/types';
import { AuthenticationError } from '@/lib/errors';
import { setRefreshTokenCookie } from '@/lib/refresh-cookie.lib';

export const verifyMfaRecoveryCode: MutationResolvers<GraphqlContext>['verifyMfaRecoveryCode'] =
  async (_, args, context) => {
    const userId = context.user?.userId;
    const sessionId = context.user?.tokenId;
    if (!userId || !sessionId) {
      throw new AuthenticationError('Unauthorized');
    }
    const result = await context.handlers.auth.verifyMfaRecoveryCode(
      userId,
      sessionId,
      args.input.code,
      context.requestBaseUrl
    );
    setRefreshTokenCookie(context.res, result.refreshToken);
    return result;
  };
