import { MutationResolvers } from '@grantjs/schema';

import { GraphqlContext } from '@/graphql/types';

export const createGroupResolver: MutationResolvers<GraphqlContext>['createGroup'] = async (
  _parent,
  { input },
  context
) => {
  const createdGroup = await context.handlers.groups.createGroup({ input });
  return createdGroup;
};
