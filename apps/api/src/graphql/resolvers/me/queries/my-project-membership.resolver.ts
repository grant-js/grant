import { QueryResolvers } from '@grantjs/schema';

import { GraphqlContext } from '@/graphql/types';

export const myProjectMembershipResolver: QueryResolvers<GraphqlContext>['myProjectMembership'] =
  async (_parent, { projectId }, context) => {
    return await context.handlers.me.myProjectMembership(projectId);
  };
