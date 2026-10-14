import { MutationResolvers } from '@grantjs/schema';

import { GraphqlContext } from '@/graphql/types';

export const requestProjectSyncUploadUrlResolver: MutationResolvers<GraphqlContext>['requestProjectSyncUploadUrl'] =
  async (_parent, args, context) => {
    return await context.handlers.projects.requestProjectSyncUploadUrl(args);
  };
