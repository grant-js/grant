import { MutationResolvers } from '@logusgraphics/grant-schema';

import { GraphqlContext } from '@/graphql/types';

export const revokeInvitationResolver: MutationResolvers<GraphqlContext>['revokeInvitation'] =
  async (_parent, { id }, context) => {
    if (!context.user) {
      throw new Error('Authentication required');
    }

    const invitation = await context.handlers.organizationInvitations.revokeInvitation(id);
    return invitation;
  };
