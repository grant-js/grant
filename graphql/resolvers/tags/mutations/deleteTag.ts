import { MutationResolvers } from '@/graphql/generated/types';

export const deleteTagResolver: MutationResolvers['deleteTag'] = async (
  _parent,
  { id },
  context
) => {
  const deletedTag = await context.providers.tags.deleteTag({ id });
  return deletedTag ? true : false;
};
