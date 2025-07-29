import { AddGroupTagParams, AddGroupTagResult } from '@/graphql/providers/group-tags/types';
import { createGroupTag } from './dataStore';

export const addGroupTag = async (params: AddGroupTagParams): Promise<AddGroupTagResult> => {
  const { input } = params;
  return createGroupTag(input.groupId, input.tagId);
};
