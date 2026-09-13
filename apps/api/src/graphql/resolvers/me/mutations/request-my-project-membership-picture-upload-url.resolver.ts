import { MutationResolvers } from '@grantjs/schema';

import { GraphqlContext } from '@/graphql/types';

export const requestMyProjectMembershipPictureUploadUrlResolver: MutationResolvers<GraphqlContext>['requestMyProjectMembershipPictureUploadUrl'] =
  async (_parent, { input }, context) => {
    return await context.handlers.me.requestMyProjectMembershipPictureUploadUrl(input);
  };
