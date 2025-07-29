import { AddUserTagParams, AddUserTagResult } from '@/graphql/providers/user-tags/types';

import { createUserTag } from './dataStore';

export const addUserTag = async (params: AddUserTagParams): Promise<AddUserTagResult> => {
  const { input } = params;
  return createUserTag(input.userId, input.tagId);
};
