import { MutationResolvers } from '@logusgraphics/grant-schema';

import { GraphqlContext } from '@/graphql/types';

export const deleteGroupResolver: MutationResolvers<GraphqlContext>['deleteGroup'] = async (
  _parent,
  { id, scope },
  context
) => {
  const deletedGroup = await context.controllers.groups.deleteGroup({ id, scope });
  return deletedGroup;
};
