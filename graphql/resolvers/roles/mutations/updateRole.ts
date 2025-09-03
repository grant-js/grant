import { MutationResolvers } from '@/graphql/generated/types';
export const updateRoleResolver: MutationResolvers['updateRole'] = async (
  _parent,
  { id, input },
  context
) => {
  const updatedRole = await context.controllers.roles.updateRole({ id, input });
  return updatedRole;
};
