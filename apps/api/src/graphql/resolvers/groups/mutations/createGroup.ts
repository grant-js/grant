import { MutationResolvers } from '@logusgraphics/grant-schema';

import { GraphqlContext } from '@/graphql/types';

export const createGroupResolver: MutationResolvers<GraphqlContext>['createGroup'] = async (
  _parent,
  { input },
  context
) => {
  const createdGroup = await context.controllers.groups.createGroup({ input });
  return createdGroup;
};
