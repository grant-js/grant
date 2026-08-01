import { MutationResolvers } from '@grantjs/schema';

import { GraphqlContext } from '@/graphql/types';

export const updateMyProjectMembershipResolver: MutationResolvers<GraphqlContext>['updateMyProjectMembership'] =
  async (_parent, { input }, context) => {
    return await context.handlers.me.updateMyProjectMembership(input);
  };
