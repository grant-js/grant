import { MutationResolvers } from '@logusgraphics/grant-schema';

import { GraphqlContext } from '@/graphql/types';
import { AuthenticationError } from '@/lib/errors';

export const resendInvitationEmailResolver: MutationResolvers<GraphqlContext>['resendInvitationEmail'] =
  async (_parent, { id }, context) => {
    if (!context.user) {
      throw new AuthenticationError('Authentication required', 'errors:auth.unauthorized');
    }

    const invitation = await context.handlers.organizationInvitations.resendInvitationEmail(
      id,
      context.locale
    );

    return invitation;
  };
