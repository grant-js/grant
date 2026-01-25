import { MutationResolvers } from '@grantjs/schema';

import { GraphqlContext } from '@/graphql/types';

export const revokeInvitationResolver: MutationResolvers<GraphqlContext>['revokeInvitation'] =
  async (_parent, { id }, context) => {
    const invitation = await context.handlers.organizationInvitations.revokeInvitation(id);
    return invitation;
  };
