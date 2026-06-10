import { MutationResolvers } from '@grantjs/schema';

import { GraphqlContext } from '@/graphql/types';
import { AuthenticationError } from '@/lib/errors';
import { resolveSyncJobEnqueuedById } from '@/lib/resolve-sync-job-enqueued-by.lib';

export const startProjectSyncResolver: MutationResolvers<GraphqlContext>['startProjectSync'] =
  async (_parent, args, context) => {
    const enqueuedById = resolveSyncJobEnqueuedById(context.user);
    if (!enqueuedById) {
      throw new AuthenticationError('Authenticated user required to start a sync job');
    }
    return context.handlers.projects.startProjectSync({ ...args, enqueuedById });
  };
