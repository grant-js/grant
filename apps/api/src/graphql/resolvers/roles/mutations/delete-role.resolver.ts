import { MutationResolvers } from '@grantjs/schema';

import { GraphqlContext } from '@/graphql/types';
export const deleteRoleResolver: MutationResolvers<GraphqlContext>['deleteRole'] = async (
  _parent,
  { id, scope },
  context
) => {
  const deletedRole = await context.handlers.roles.deleteRole({ id, scope });
  return deletedRole;
};
