import { MutationResolvers } from '@/graphql/generated/types';

export const deleteGroupResolver: MutationResolvers['deleteGroup'] = async (
  _parent,
  { id, scope },
  context
) => {
  const deletedGroup = await context.controllers.groups.deleteGroup({ id, scope });
  return deletedGroup;
};
