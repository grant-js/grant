import { MutationResolvers } from '@grantjs/schema';

import { GraphqlContext } from '@/graphql/types';
export const updateRoleResolver: MutationResolvers<GraphqlContext>['updateRole'] = async (
  _parent,
  { id, input },
  context
) => {
  const updatedRole = await context.handlers.roles.updateRole({ id, input });
  return updatedRole;
};
