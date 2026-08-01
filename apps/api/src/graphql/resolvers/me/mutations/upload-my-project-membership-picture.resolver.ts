import { MutationResolvers } from '@grantjs/schema';

import { GraphqlContext } from '@/graphql/types';

export const uploadMyProjectMembershipPictureResolver: MutationResolvers<GraphqlContext>['uploadMyProjectMembershipPicture'] =
  async (_parent, { input }, context) => {
    return await context.handlers.me.uploadMyProjectMembershipPicture(input);
  };
