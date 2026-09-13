import { MutationResolvers } from '@grantjs/schema';

import { GraphqlContext } from '@/graphql/types';

export const requestProjectPictureUploadUrlResolver: MutationResolvers<GraphqlContext>['requestProjectPictureUploadUrl'] =
  async (_parent, { input }, context) => {
    return await context.handlers.projects.requestProjectPictureUploadUrl(input);
  };
