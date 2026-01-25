import { MutationResolvers } from '@grantjs/schema';

import { GraphqlContext } from '@/graphql/types';

export const updateGroupResolver: MutationResolvers<GraphqlContext>['updateGroup'] = async (
  _parent,
  { id, input },
  context
) => {
  const updatedGroup = await context.handlers.groups.updateGroup({ id, input });
  return updatedGroup;
};
