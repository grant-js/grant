import { MutationResolvers } from '@logusgraphics/grant-schema';

import { GraphqlContext } from '@/graphql/types';
import { AuthenticationError } from '@/lib/errors';

export const revokeInvitationResolver: MutationResolvers<GraphqlContext>['revokeInvitation'] =
  async (_parent, { id }, context) => {
    if (!context.user) {
      throw new AuthenticationError('Authentication required', 'errors:auth.unauthorized');
    }

    const invitation = await context.handlers.organizationInvitations.revokeInvitation(id);
    return invitation;
  };
