import { MutationResolvers } from '@grantjs/schema';

import { GraphqlContext } from '@/graphql/types';

export const confirmProjectAppPictureUploadResolver: MutationResolvers<GraphqlContext>['confirmProjectAppPictureUpload'] =
  async (_parent, { input }, context) => {
    return await context.handlers.projectApps.confirmProjectAppPictureUpload(input);
  };
