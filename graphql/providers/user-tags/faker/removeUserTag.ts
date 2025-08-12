import { MutationRemoveUserTagArgs, UserTag } from '@/graphql/generated/types';

import { deleteUserTagByUserAndTag } from './dataStore';
export const removeUserTag = async (params: MutationRemoveUserTagArgs): Promise<UserTag> => {
  const { input } = params;
  const deletedUserTag = deleteUserTagByUserAndTag(input.userId, input.tagId);
  if (!deletedUserTag) {
    throw new Error(
      `UserTag relationship not found for user ${input.userId} and tag ${input.tagId}`
    );
  }
  return deletedUserTag;
};
