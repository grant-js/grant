import { MutationResolvers } from '@logusgraphics/grant-schema';

import { GraphqlContext } from '@/graphql/types';
import { AuthenticationError } from '@/lib/errors';

export const removeOrganizationMemberResolver: MutationResolvers<GraphqlContext>['removeOrganizationMember'] =
  async (_parent, { input }, context) => {
    if (!context.user) {
      throw new AuthenticationError('Authentication required', 'errors:auth.unauthorized');
    }

    const removedMember = await context.handlers.organizationMembers.removeOrganizationMember({
      input,
    });

    return removedMember;
  };
