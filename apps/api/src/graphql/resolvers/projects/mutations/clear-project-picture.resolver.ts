import { MutationResolvers } from '@grantjs/schema';

import { GraphqlContext } from '@/graphql/types';

export const clearProjectPictureResolver: MutationResolvers<GraphqlContext>['clearProjectPicture'] =
  async (_parent, { input }, context) => {
    return await context.handlers.projects.clearProjectPicture(input);
  };
