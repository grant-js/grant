import { MutationResolvers } from '@/graphql/generated/types';

export const removeRoleTagResolver: MutationResolvers['removeRoleTag'] = async (
  _parent,
  { input },
  context
) => {
  const removedRoleTag = await context.providers.roleTags.removeRoleTag({ input });
  return removedRoleTag;
};
