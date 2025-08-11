import { MutationAddUserTagArgs, UserTag } from '@/graphql/generated/types';

import { createUserTag } from './dataStore';

export const addUserTag = async (params: MutationAddUserTagArgs): Promise<UserTag> => {
  const { input } = params;
  return createUserTag(input.userId, input.tagId);
};
