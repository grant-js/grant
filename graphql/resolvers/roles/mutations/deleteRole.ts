import { MutationResolvers } from '@/graphql/generated/types';
export const deleteRoleResolver: MutationResolvers['deleteRole'] = async (
  _parent,
  { id, scope },
  context
) => {
  const deletedRole = await context.controllers.roles.deleteRole({ id, scope });
  return deletedRole;
};
