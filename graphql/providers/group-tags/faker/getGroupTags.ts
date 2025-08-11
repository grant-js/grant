import { QueryGroupTagsArgs } from '@/graphql/generated/types';
import { GroupTag } from '@/graphql/generated/types';
import { getGroupTagsByGroupId } from '@/graphql/providers/group-tags/faker/dataStore';

export const getGroupTags = async (params: QueryGroupTagsArgs): Promise<GroupTag[]> => {
  const { groupId, scope } = params;
  return getGroupTagsByGroupId(scope, groupId);
};
