import {
  MutationAddGroupTagArgs,
  MutationRemoveGroupTagArgs,
  QueryGroupTagsArgs,
  GroupTag,
} from '@/graphql/generated/types';

export interface GroupTagDataProvider {
  getGroupTags(params: QueryGroupTagsArgs): Promise<GroupTag[]>;
  addGroupTag(params: MutationAddGroupTagArgs): Promise<GroupTag>;
  removeGroupTag(params: MutationRemoveGroupTagArgs): Promise<boolean>;
}
