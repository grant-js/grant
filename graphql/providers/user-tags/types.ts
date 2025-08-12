import {
  MutationAddUserTagArgs,
  MutationRemoveUserTagArgs,
  UserTag,
  QueryUserTagsArgs,
} from '@/graphql/generated/types';
export interface UserTagDataProvider {
  getUserTags(params: QueryUserTagsArgs): Promise<UserTag[]>;
  addUserTag(params: MutationAddUserTagArgs): Promise<UserTag>;
  removeUserTag(params: MutationRemoveUserTagArgs): Promise<UserTag>;
}
