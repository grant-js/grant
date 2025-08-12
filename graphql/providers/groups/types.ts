import {
  QueryGroupsArgs,
  MutationCreateGroupArgs,
  MutationUpdateGroupArgs,
  MutationDeleteGroupArgs,
  Group,
  GroupPage,
} from '@/graphql/generated/types';
export interface GroupDataProvider {
  getGroups(params: QueryGroupsArgs): Promise<GroupPage>;
  createGroup(params: MutationCreateGroupArgs): Promise<Group>;
  updateGroup(params: MutationUpdateGroupArgs): Promise<Group>;
  deleteGroup(params: MutationDeleteGroupArgs): Promise<Group>;
}
