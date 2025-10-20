import { QueryResolvers } from '@logusgraphics/grant-schema';

import { GraphqlContext } from '@/graphql/types';
import { AuthenticationError } from '@/lib/errors';

export const organizationInvitationsResolver: QueryResolvers<GraphqlContext>['organizationInvitations'] =
  async (_parent, { organizationId, status }, context) => {
    if (!context.user) {
      throw new AuthenticationError('Authentication required', 'errors:auth.unauthorized');
    }

    const invitations = await context.handlers.organizationInvitations.getOrganizationInvitations(
      organizationId,
      status || undefined
    );

    return invitations;
  };
