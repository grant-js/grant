import { QueryResolvers } from '@/graphql/generated/types';

export const getUserTagsResolver: QueryResolvers['userTags'] = async (
  _parent,
  { userId, scope },
  context
) => {
  const userTags = await context.providers.userTags.getUserTags({
    userId,
    scope,
  });
  return userTags;
};
