import { GetUserTagsParams, GetUserTagsResult } from '@/graphql/providers/user-tags/types';

import { getUserTagsByUserId } from './dataStore';

export const getUserTags = async (params: GetUserTagsParams): Promise<GetUserTagsResult> => {
  const { userId } = params;
  return getUserTagsByUserId(userId);
};
