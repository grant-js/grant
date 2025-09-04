import { UserResolvers } from '@/graphql/generated/types';

export const userTagsResolver: UserResolvers['tags'] = async (parent, _args, context) => {
  const userId = parent.id;

  if (parent.tags) {
    return parent.tags;
  }

  return await context.controllers.users.getUserTags({
    userId,
    requestedFields: ['tags'],
  });
};
