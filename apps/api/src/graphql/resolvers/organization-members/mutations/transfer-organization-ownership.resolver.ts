import { MutationResolvers } from '@grantjs/schema';

import { GraphqlContext } from '@/graphql/types';
import { AuthenticationError } from '@/lib/errors';

export const transferOrganizationOwnershipResolver: MutationResolvers<GraphqlContext>['transferOrganizationOwnership'] =
  async (_parent, { input }, context) => {
    const callerUserId = context.user?.userId;
    if (!callerUserId) {
      throw new AuthenticationError();
    }

    return context.handlers.organizationMembers.transferOwnership(input, callerUserId);
  };
