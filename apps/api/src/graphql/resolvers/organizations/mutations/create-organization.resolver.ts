import { MutationResolvers } from '@logusgraphics/grant-schema';

import { GraphqlContext } from '@/graphql/types';

export const createOrganizationResolver: MutationResolvers<GraphqlContext>['createOrganization'] =
  async (_parent, { input }, context) => {
    if (!context.user) {
      throw new Error('Authentication required');
    }

    const createdOrganization = await context.handlers.organizations.createOrganization(
      { input },
      context.user.id
    );
    return createdOrganization;
  };
