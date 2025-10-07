import { MutationResolvers } from '@logusgraphics/grant-schema';

import { GraphqlContext } from '@/graphql/types';
export const deleteRoleResolver: MutationResolvers<GraphqlContext>['deleteRole'] = async (
  _parent,
  { id, scope },
  context
) => {
  const deletedRole = await context.controllers.roles.deleteRole({ id, scope });
  return deletedRole;
};
