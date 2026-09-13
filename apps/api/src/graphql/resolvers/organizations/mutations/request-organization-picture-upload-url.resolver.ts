import { MutationResolvers } from '@grantjs/schema';

import { GraphqlContext } from '@/graphql/types';

export const requestOrganizationPictureUploadUrlResolver: MutationResolvers<GraphqlContext>['requestOrganizationPictureUploadUrl'] =
  async (_parent, { input }, context) => {
    return await context.handlers.organizations.requestOrganizationPictureUploadUrl(input);
  };
