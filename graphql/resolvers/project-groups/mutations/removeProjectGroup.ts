import { MutationResolvers } from '@/graphql/generated/types';

export const removeProjectGroupResolver: MutationResolvers['removeProjectGroup'] = async (
  _parent,
  { input },
  context
) => {
  const removedProjectGroup = await context.providers.projectGroups.removeProjectGroup({
    input,
  });
  return removedProjectGroup;
};
