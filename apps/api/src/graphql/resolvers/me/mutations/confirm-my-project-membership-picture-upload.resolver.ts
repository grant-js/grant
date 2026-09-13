import { MutationResolvers } from '@grantjs/schema';

import { GraphqlContext } from '@/graphql/types';

export const confirmMyProjectMembershipPictureUploadResolver: MutationResolvers<GraphqlContext>['confirmMyProjectMembershipPictureUpload'] =
  async (_parent, { input }, context) => {
    return await context.handlers.me.confirmMyProjectMembershipPictureUpload(input);
  };
