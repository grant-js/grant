import { MutationResolvers } from '@grantjs/schema';

import { GraphqlContext } from '@/graphql/types';

export const confirmMyUserPictureUploadResolver: MutationResolvers<GraphqlContext>['confirmMyUserPictureUpload'] =
  async (_parent, { input }, context) => {
    return await context.handlers.me.confirmMyUserPictureUpload(input);
  };
