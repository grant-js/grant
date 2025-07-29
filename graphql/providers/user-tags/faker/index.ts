import { UserTagDataProvider } from '@/graphql/providers/user-tags/types';
import { getUserTags } from '@/graphql/providers/user-tags/faker/getUserTags';
import { addUserTag } from '@/graphql/providers/user-tags/faker/addUserTag';
import { removeUserTag } from '@/graphql/providers/user-tags/faker/removeUserTag';

export const userTagFakerProvider: UserTagDataProvider = {
  getUserTags,
  addUserTag,
  removeUserTag,
};
