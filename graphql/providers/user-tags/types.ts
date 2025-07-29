import {
  MutationAddUserTagArgs,
  MutationRemoveUserTagArgs,
  QueryUserTagsArgs,
  UserTag,
} from '@/graphql/generated/types';

export type GetUserTagsParams = QueryUserTagsArgs;
export type GetUserTagsResult = UserTag[];

export type AddUserTagParams = MutationAddUserTagArgs;
export type AddUserTagResult = UserTag;

export type RemoveUserTagParams = MutationRemoveUserTagArgs;
export type RemoveUserTagResult = UserTag;

export interface UserTagDataProvider {
  getUserTags(params: GetUserTagsParams): Promise<GetUserTagsResult>;
  addUserTag(params: AddUserTagParams): Promise<AddUserTagResult>;
  removeUserTag(params: RemoveUserTagParams): Promise<RemoveUserTagResult>;
}
