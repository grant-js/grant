import { MutationResolvers } from '@logusgraphics/grant-schema';

import { GraphqlContext } from '@/graphql/types';
import { AuthenticationError } from '@/lib/errors';

export const inviteMemberResolver: MutationResolvers<GraphqlContext>['inviteMember'] = async (
  _parent,
  { input },
  context
) => {
  if (!context.user) {
    throw new AuthenticationError('Authentication required', 'errors:auth.unauthorized');
  }

  const invitation = await context.handlers.organizationInvitations.inviteMember(
    input,
    context.user.id
  );

  return invitation;
};
