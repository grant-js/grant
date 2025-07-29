import { MutationResolvers } from '@/graphql/generated/types';

export const removeUserTagResolver: MutationResolvers['removeUserTag'] = async (
  _parent,
  { input },
  context
) => {
  await context.providers.userTags.removeUserTag({ input });
  return true;
};
