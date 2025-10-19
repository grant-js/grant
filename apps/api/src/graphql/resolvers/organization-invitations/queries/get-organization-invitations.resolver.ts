import { QueryResolvers } from '@logusgraphics/grant-schema';

import { GraphqlContext } from '@/graphql/types';

export const organizationInvitationsResolver: QueryResolvers<GraphqlContext>['organizationInvitations'] =
  async (_parent, { organizationId, status }, context) => {
    if (!context.user) {
      throw new Error('Authentication required');
    }

    const invitations = await context.handlers.organizationInvitations.getOrganizationInvitations(
      organizationId,
      status || undefined
    );

    return invitations;
  };
