import { MutationResolvers } from '@logusgraphics/grant-schema';

import { GraphqlContext } from '@/graphql/types';
export const updateRoleResolver: MutationResolvers<GraphqlContext>['updateRole'] = async (
  _parent,
  { id, input },
  context
) => {
  const updatedRole = await context.controllers.roles.updateRole({ id, input });
  return updatedRole;
};
