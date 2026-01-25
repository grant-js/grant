import { MutationResolvers } from '@grantjs/schema';

import { GraphqlContext } from '@/graphql/types';

export const renewInvitationResolver: MutationResolvers<GraphqlContext>['renewInvitation'] = async (
  _parent,
  { id },
  context
) => {
  const invitation = await context.handlers.organizationInvitations.renewInvitation(
    id,
    context.locale
  );

  return invitation;
};
