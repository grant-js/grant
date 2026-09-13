import { MutationResolvers } from '@grantjs/schema';

import { GraphqlContext } from '@/graphql/types';

export const confirmProjectPictureUploadResolver: MutationResolvers<GraphqlContext>['confirmProjectPictureUpload'] =
  async (_parent, { input }, context) => {
    return await context.handlers.projects.confirmProjectPictureUpload(input);
  };
