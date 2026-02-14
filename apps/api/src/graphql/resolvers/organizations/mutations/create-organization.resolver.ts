import { MutationResolvers } from '@grantjs/schema';

import { GraphqlContext } from '@/graphql/types';
import { AuthenticationError } from '@/lib/errors';

export const createOrganizationResolver: MutationResolvers<GraphqlContext>['createOrganization'] =
  async (_parent, { input }, context) => {
    if (!context.user) {
      throw new AuthenticationError('Authentication required');
    }

    const createdOrganization = await context.handlers.organizations.createOrganization(
      { input },
      context.user.userId
    );
    return createdOrganization;
  };
