import { MutationResolvers } from '@/graphql/generated/types';

export const createTagResolver: MutationResolvers['createTag'] = async (
  _parent,
  { input },
  context
) => {
  const createdTag = await context.providers.tags.createTag({ input });
  return createdTag;
};
