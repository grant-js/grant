import { MutationResolvers } from '@logusgraphics/grant-schema';

import { GraphqlContext } from '@/graphql/types';

export const inviteMemberResolver: MutationResolvers<GraphqlContext>['inviteMember'] = async (
  _parent,
  { input },
  context
) => {
  if (!context.user) {
    throw new Error('Authentication required');
  }

  const invitation = await context.handlers.organizationInvitations.inviteMember(
    input,
    context.user.id
  );

  return invitation;
};
