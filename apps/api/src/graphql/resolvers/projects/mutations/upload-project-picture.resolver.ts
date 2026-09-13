import { MutationResolvers } from '@grantjs/schema';

import { GraphqlContext } from '@/graphql/types';

export const uploadProjectPictureResolver: MutationResolvers<GraphqlContext>['uploadProjectPicture'] =
  async (_parent, { input }, context) => {
    return await context.handlers.projects.uploadProjectPicture(input);
  };
