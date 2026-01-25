import { MutationResolvers } from '@grantjs/schema';

import { GraphqlContext } from '@/graphql/types';

export const removeOrganizationMemberResolver: MutationResolvers<GraphqlContext>['removeOrganizationMember'] =
  async (_parent, { userId, input }, context) => {
    const removedMember = await context.handlers.organizationMembers.removeOrganizationMember({
      userId,
      input,
    });

    return removedMember;
  };
