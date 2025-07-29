import { RemoveUserTagParams, RemoveUserTagResult } from '@/graphql/providers/user-tags/types';

import { deleteUserTagByUserAndTag } from './dataStore';

export const removeUserTag = async (params: RemoveUserTagParams): Promise<RemoveUserTagResult> => {
  const { input } = params;
  const deletedUserTag = deleteUserTagByUserAndTag(input.userId, input.tagId);

  if (!deletedUserTag) {
    throw new Error(
      `UserTag relationship not found for user ${input.userId} and tag ${input.tagId}`
    );
  }

  return deletedUserTag;
};
