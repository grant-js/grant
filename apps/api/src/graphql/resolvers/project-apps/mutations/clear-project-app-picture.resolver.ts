import { MutationResolvers } from '@grantjs/schema';

import { GraphqlContext } from '@/graphql/types';

export const clearProjectAppPictureResolver: MutationResolvers<GraphqlContext>['clearProjectAppPicture'] =
  async (_parent, { input }, context) => {
    return await context.handlers.projectApps.clearProjectAppPicture(input);
  };
