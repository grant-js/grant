import { MutationResolvers } from '@grantjs/schema';

import { GraphqlContext } from '@/graphql/types';
import { AuthenticationError } from '@/lib/errors';
import { resolveSyncJobEnqueuedById } from '@/lib/resolve-sync-job-enqueued-by.lib';

export const startProjectExportResolver: MutationResolvers<GraphqlContext>['startProjectExport'] =
  async (_parent, args, context) => {
    const enqueuedById = resolveSyncJobEnqueuedById(context.user);
    if (!enqueuedById) {
      throw new AuthenticationError('Authenticated user required to start an export job');
    }
    return context.handlers.projects.startProjectExport({ ...args, enqueuedById });
  };
