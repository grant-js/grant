import { MutationResolvers } from '@logusgraphics/grant-schema';

import { GraphqlContext } from '@/graphql/types';

export const createOrganizationResolver: MutationResolvers<GraphqlContext>['createOrganization'] =
  async (_parent, { input }, context) => {
    const createdOrganization = await context.controllers.organizations.createOrganization({
      input,
    });
    return createdOrganization;
  };
