import { MutationResolvers } from '@/graphql/generated/types';

export const updateGroupResolver: MutationResolvers['updateGroup'] = async (
  _parent,
  { id, input },
  context
) => {
  const updatedGroup = await context.providers.groups.updateGroup({ id, input });
  return updatedGroup;
};
