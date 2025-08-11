import { MutationRemoveGroupTagArgs } from '@/graphql/generated/types';
import { deleteGroupTagByGroupAndTag } from '@/graphql/providers/group-tags/faker/dataStore';

export const removeGroupTag = async (params: MutationRemoveGroupTagArgs): Promise<boolean> => {
  const { input } = params;
  const deletedGroupTag = deleteGroupTagByGroupAndTag(input.groupId, input.tagId);

  if (!deletedGroupTag) {
    throw new Error(
      `GroupTag relationship not found for group ${input.groupId} and tag ${input.tagId}`
    );
  }

  return deletedGroupTag !== null;
};
