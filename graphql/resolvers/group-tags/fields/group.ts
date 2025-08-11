import { GroupTagResolvers } from '@/graphql/generated/types';

export const groupTagGroupResolver: GroupTagResolvers['group'] = async (
  parent,
  { scope },
  context
) => {
  const groupsResult = await context.providers.groups.getGroups({
    ids: [parent.groupId],
    scope,
  });

  const group = groupsResult.groups[0];

  if (!group) {
    throw new Error(`Group with ID ${parent.groupId} not found`);
  }

  return group;
};
