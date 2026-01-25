import { QueryResolvers } from '@grantjs/schema';

import { GraphqlContext } from '@/graphql/types';

export const organizationInvitationsResolver: QueryResolvers<GraphqlContext>['organizationInvitations'] =
  async (_parent, args, context) => {
    const invitations =
      await context.handlers.organizationInvitations.getOrganizationInvitations(args);

    return invitations;
  };
