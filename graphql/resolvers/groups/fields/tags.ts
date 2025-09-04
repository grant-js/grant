import { GroupResolvers } from '@/graphql/generated/types';

export const groupTagsResolver: GroupResolvers['tags'] = async (parent, _args, context) => {
  const groupId = parent.id;

  if (parent.tags) {
    return parent.tags;
  }

  return await context.controllers.groups.getGroupTags({
    groupId,
    requestedFields: ['tags'],
  });
};
