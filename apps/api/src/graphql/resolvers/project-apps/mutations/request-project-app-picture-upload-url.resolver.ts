import { MutationResolvers } from '@grantjs/schema';

import { GraphqlContext } from '@/graphql/types';

export const requestProjectAppPictureUploadUrlResolver: MutationResolvers<GraphqlContext>['requestProjectAppPictureUploadUrl'] =
  async (_parent, { input }, context) => {
    return await context.handlers.projectApps.requestProjectAppPictureUploadUrl(input);
  };
