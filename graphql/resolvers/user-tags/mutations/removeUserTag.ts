import { MutationResolvers } from '@/graphql/generated/types';

export const removeUserTagResolver: MutationResolvers['removeUserTag'] = async (
  _parent,
  { input },
  context
) => {
  const removedUserTag = await context.providers.userTags.removeUserTag({ input });
  return removedUserTag;
};
