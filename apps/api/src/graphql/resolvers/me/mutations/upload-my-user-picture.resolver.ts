import { MutationResolvers } from '@grantjs/schema';

import { GraphqlContext } from '@/graphql/types';

export const uploadMyUserPictureResolver: MutationResolvers<GraphqlContext>['uploadMyUserPicture'] =
  async (_parent, { input }, context) => {
    return await context.handlers.me.uploadMyUserPicture(input);
  };
