import { MutationResolvers } from '@logusgraphics/grant-schema';

import { GraphqlContext } from '@/graphql/types';
import { BadRequestError, NotFoundError } from '@/lib/errors';

export const revokeUserSessionResolver: MutationResolvers<GraphqlContext>['revokeUserSession'] =
  async (_parent, { id }, context) => {
    if (!context.user) {
      throw new BadRequestError('Authentication required', 'errors:auth.required');
    }

    const sessions = await context.handlers.users.getUserSessions({
      userId: context.user.id,
      limit: 1,
    });

    const session = sessions.userSessions.find((s) => s.id === id);

    if (!session) {
      throw new NotFoundError('Session not found', 'errors:common.notFound');
    }

    if (session.userId !== context.user.id) {
      throw new BadRequestError(
        'You can only revoke your own sessions',
        'errors:auth.unauthorized'
      );
    }

    await context.handlers.users.revokeUserSession(id);

    return {
      success: true,
      message: 'Session revoked successfully',
    };
  };
