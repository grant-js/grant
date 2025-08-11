import { GroupTag, MutationAddGroupTagArgs } from '@/graphql/generated/types';
import { createGroupTag } from '@/graphql/providers/group-tags/faker/dataStore';

export const addGroupTag = async (params: MutationAddGroupTagArgs): Promise<GroupTag> => {
  const { input } = params;
  return createGroupTag(input.groupId, input.tagId);
};
