import { MutationResolvers } from '@/graphql/generated/types';

export const createGroupResolver: MutationResolvers['createGroup'] = async (
  _parent,
  { input },
  context
) => {
  const createdGroup = await context.providers.groups.createGroup({ input });
  return createdGroup;
};
