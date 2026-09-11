import { MutationResolvers } from '@grantjs/schema';

import { GraphqlContext } from '@/graphql/types';
import { AuthenticationError } from '@/lib/errors';

export const requestUserPictureUploadUrlResolver: MutationResolvers<GraphqlContext>['requestUserPictureUploadUrl'] =
  async (_parent, { input }, context) => {
    const actorUserId = context.user?.userId;
    if (!actorUserId) {
      throw new AuthenticationError('Authentication required');
    }
    return await context.handlers.users.requestUserPictureUploadUrl({ ...input, actorUserId });
  };
