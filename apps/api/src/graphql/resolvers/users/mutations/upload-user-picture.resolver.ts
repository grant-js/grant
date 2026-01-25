import { MutationResolvers } from '@grantjs/schema';

import { GraphqlContext } from '@/graphql/types';

export const uploadUserPictureResolver: MutationResolvers<GraphqlContext>['uploadUserPicture'] =
  async (_parent, { input }, context) => {
    return await context.handlers.users.uploadUserPicture(input);
  };
