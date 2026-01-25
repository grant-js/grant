import { MutationResolvers } from '@grantjs/schema';

import { GraphqlContext } from '@/graphql/types';

export const deleteGroupResolver: MutationResolvers<GraphqlContext>['deleteGroup'] = async (
  _parent,
  { id, scope },
  context
) => {
  const deletedGroup = await context.handlers.groups.deleteGroup({ id, scope });
  return deletedGroup;
};
