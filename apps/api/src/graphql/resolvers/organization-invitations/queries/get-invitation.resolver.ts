import { QueryResolvers } from '@logusgraphics/grant-schema';

import { GraphqlContext } from '@/graphql/types';

export const invitationResolver: QueryResolvers<GraphqlContext>['invitation'] = async (
  _parent,
  { token },
  context
) => {
  const invitation = await context.handlers.organizationInvitations.getInvitation(token);
  return invitation;
};
