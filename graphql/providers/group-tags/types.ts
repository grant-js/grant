import {
  MutationAddGroupTagArgs,
  MutationRemoveGroupTagArgs,
  QueryGroupTagsArgs,
  GroupTag,
} from '@/graphql/generated/types';

export type GetGroupTagsParams = QueryGroupTagsArgs;
export type GetGroupTagsResult = GroupTag[];

export type AddGroupTagParams = MutationAddGroupTagArgs;
export type AddGroupTagResult = GroupTag;

export type RemoveGroupTagParams = MutationRemoveGroupTagArgs;
export type RemoveGroupTagResult = GroupTag;

export interface GroupTagDataProvider {
  getGroupTags(params: GetGroupTagsParams): Promise<GetGroupTagsResult>;
  addGroupTag(params: AddGroupTagParams): Promise<AddGroupTagResult>;
  removeGroupTag(params: RemoveGroupTagParams): Promise<RemoveGroupTagResult>;
}
