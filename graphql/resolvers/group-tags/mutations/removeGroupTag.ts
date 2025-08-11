import { MutationResolvers } from '@/graphql/generated/types';

export const removeGroupTagResolver: MutationResolvers['removeGroupTag'] = async (
  _parent,
  { input },
  context
) => {
  const removedGroupTag = await context.providers.groupTags.removeGroupTag({ input });
  return removedGroupTag;
};
