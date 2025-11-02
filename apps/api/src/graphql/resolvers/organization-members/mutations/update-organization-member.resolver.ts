import { MutationResolvers } from '@logusgraphics/grant-schema';

import { GraphqlContext } from '@/graphql/types';
import { AuthenticationError } from '@/lib/errors';

export const updateOrganizationMemberResolver: MutationResolvers<GraphqlContext>['updateOrganizationMember'] =
  async (_parent, { userId, organizationId, input }, context) => {
    if (!context.user) {
      throw new AuthenticationError('Authentication required', 'errors:auth.unauthorized');
    }

    const updatedMember = await context.handlers.organizationMembers.updateOrganizationMember({
      userId,
      organizationId,
      input,
    });

    return updatedMember;
  };
