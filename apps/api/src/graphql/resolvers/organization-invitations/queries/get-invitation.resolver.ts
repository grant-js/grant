import { OrganizationInvitation, QueryResolvers } from '@logusgraphics/grant-schema';

import { GraphqlContext } from '@/graphql/types';
import { getDirectFieldSelection } from '@/lib/field-selection.lib';

export const invitationResolver: QueryResolvers<GraphqlContext>['invitation'] = async (
  _parent,
  { token },
  context,
  info
) => {
  const requestedFields = info
    ? getDirectFieldSelection<keyof OrganizationInvitation>(info)
    : undefined;
  const invitation = await context.handlers.organizationInvitations.getInvitation({
    token,
    requestedFields,
  });
  return invitation;
};
