import { addUserTag } from '@/graphql/providers/user-tags/faker/addUserTag';
import { getUserTags } from '@/graphql/providers/user-tags/faker/getUserTags';
import { removeUserTag } from '@/graphql/providers/user-tags/faker/removeUserTag';
import { UserTagDataProvider } from '@/graphql/providers/user-tags/types';

export const userTagFakerProvider: UserTagDataProvider = {
  getUserTags,
  addUserTag,
  removeUserTag,
};
