import { MutationResolvers } from '@grantjs/schema';

import { GraphqlContext } from '@/graphql/types';

export const uploadOrganizationPictureResolver: MutationResolvers<GraphqlContext>['uploadOrganizationPicture'] =
  async (_parent, { input }, context) => {
    return await context.handlers.organizations.uploadOrganizationPicture(input);
  };
