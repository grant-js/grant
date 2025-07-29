import { GetGroupTagsParams, GetGroupTagsResult } from '@/graphql/providers/group-tags/types';

import { getGroupTagsByGroupId } from './dataStore';

export const getGroupTags = async (params: GetGroupTagsParams): Promise<GetGroupTagsResult> => {
  const { groupId } = params;
  return getGroupTagsByGroupId(groupId);
};
