import { MutationResolvers } from '@logusgraphics/grant-schema';

import { GraphqlContext } from '@/graphql/types';

export const updateGroupResolver: MutationResolvers<GraphqlContext>['updateGroup'] = async (
  _parent,
  { id, input },
  context
) => {
  const updatedGroup = await context.controllers.groups.updateGroup({ id, input });
  return updatedGroup;
};
