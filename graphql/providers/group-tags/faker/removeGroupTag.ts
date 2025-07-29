import { RemoveGroupTagParams, RemoveGroupTagResult } from '@/graphql/providers/group-tags/types';

import { deleteGroupTagByGroupAndTag } from './dataStore';

export const removeGroupTag = async (
  params: RemoveGroupTagParams
): Promise<RemoveGroupTagResult> => {
  const { input } = params;
  const deletedGroupTag = deleteGroupTagByGroupAndTag(input.groupId, input.tagId);

  if (!deletedGroupTag) {
    throw new Error(
      `GroupTag relationship not found for group ${input.groupId} and tag ${input.tagId}`
    );
  }

  return deletedGroupTag;
};
