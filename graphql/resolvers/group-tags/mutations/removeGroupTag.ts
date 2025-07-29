import { MutationResolvers } from '@/graphql/generated/types';

export const removeGroupTagResolver: MutationResolvers['removeGroupTag'] = async (
  _parent,
  { input },
  context
) => {
  await context.providers.groupTags.removeGroupTag({ input });
  return true;
};
