import {
  MutationAddGroupTagArgs,
  MutationRemoveGroupTagArgs,
  GroupTag,
  QueryGroupTagsArgs,
} from '@/graphql/generated/types';

export interface GroupTagDataProvider {
  getGroupTags(params: QueryGroupTagsArgs): Promise<GroupTag[]>;
  addGroupTag(params: MutationAddGroupTagArgs): Promise<GroupTag>;
  removeGroupTag(params: MutationRemoveGroupTagArgs): Promise<GroupTag>;
}
