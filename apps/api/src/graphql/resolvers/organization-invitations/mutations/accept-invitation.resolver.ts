import { MutationResolvers } from '@grantjs/schema';

import { GraphqlContext } from '@/graphql/types';

export const acceptInvitationResolver: MutationResolvers<GraphqlContext>['acceptInvitation'] =
  async (_parent, { input }, context) => {
    const result = await context.handlers.organizationInvitations.acceptInvitation(input);
    return result;
  };
