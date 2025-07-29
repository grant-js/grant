import { QueryResolvers } from '@/graphql/generated/types';

export const getUserTagsResolver: QueryResolvers['userTags'] = async (
  _parent,
  { userId },
  context
) => {
  const userTags = await context.providers.userTags.getUserTags({ userId });
  return userTags;
};
