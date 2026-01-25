import { MutationResolvers } from '@grantjs/schema';

import { GraphqlContext } from '@/graphql/types';

export const updateOrganizationMemberResolver: MutationResolvers<GraphqlContext>['updateOrganizationMember'] =
  async (_parent, { userId, input }, context) => {
    const updatedMember = await context.handlers.organizationMembers.updateOrganizationMember({
      userId,
      input,
    });

    return updatedMember;
  };
