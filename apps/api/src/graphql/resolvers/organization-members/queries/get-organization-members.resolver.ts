import { QueryResolvers } from '@grantjs/schema';

import { GraphqlContext } from '@/graphql/types';

export const organizationMembersResolver: QueryResolvers<GraphqlContext>['organizationMembers'] =
  async (_parent, args, context) => {
    const members = await context.handlers.organizationMembers.getOrganizationMembers(args);

    return members;
  };
