import { QueryUserTagsArgs, UserTag } from '@/graphql/generated/types';

import { getUserTagsByUserId } from './dataStore';

export const getUserTags = async (params: QueryUserTagsArgs): Promise<UserTag[]> => {
  const { userId, scope } = params;
  return getUserTagsByUserId(scope, userId);
};
