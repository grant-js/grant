import { MutationResolvers } from '@grantjs/schema';

import { GraphqlContext } from '@/graphql/types';

export const requestMyUserPictureUploadUrlResolver: MutationResolvers<GraphqlContext>['requestMyUserPictureUploadUrl'] =
  async (_parent, { input }, context) => {
    return await context.handlers.me.requestMyUserPictureUploadUrl(input);
  };
