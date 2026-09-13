import { MutationResolvers } from '@grantjs/schema';

import { GraphqlContext } from '@/graphql/types';

export const confirmOrganizationPictureUploadResolver: MutationResolvers<GraphqlContext>['confirmOrganizationPictureUpload'] =
  async (_parent, { input }, context) => {
    return await context.handlers.organizations.confirmOrganizationPictureUpload(input);
  };
