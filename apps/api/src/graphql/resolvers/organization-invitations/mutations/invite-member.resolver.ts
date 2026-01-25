import { MutationResolvers } from '@grantjs/schema';

import { GraphqlContext } from '@/graphql/types';

export const inviteMemberResolver: MutationResolvers<GraphqlContext>['inviteMember'] = async (
  _parent,
  { input },
  context
) => {
  const invitation = await context.handlers.organizationInvitations.inviteMember(
    input,
    context.locale
  );

  return invitation;
};
