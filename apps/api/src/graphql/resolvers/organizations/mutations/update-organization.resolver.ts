import { MutationResolvers } from '@grantjs/schema';

import { GraphqlContext } from '@/graphql/types';

export const updateOrganizationResolver: MutationResolvers<GraphqlContext>['updateOrganization'] =
  async (_parent, { id, input }, context) => {
    const updatedOrganization = await context.handlers.organizations.updateOrganization({
      id,
      input,
    });
    return updatedOrganization;
  };
