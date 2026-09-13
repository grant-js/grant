import { MutationResolvers } from '@grantjs/schema';

import { GraphqlContext } from '@/graphql/types';

export const uploadProjectAppPictureResolver: MutationResolvers<GraphqlContext>['uploadProjectAppPicture'] =
  async (_parent, { input }, context) => {
    return await context.handlers.projectApps.uploadProjectAppPicture(input);
  };
