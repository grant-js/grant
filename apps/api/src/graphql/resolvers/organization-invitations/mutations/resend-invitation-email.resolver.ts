import { MutationResolvers } from '@grantjs/schema';

import { GraphqlContext } from '@/graphql/types';

export const resendInvitationEmailResolver: MutationResolvers<GraphqlContext>['resendInvitationEmail'] =
  async (_parent, { id }, context) => {
    const invitation = await context.handlers.organizationInvitations.resendInvitationEmail(
      id,
      context.locale
    );

    return invitation;
  };
