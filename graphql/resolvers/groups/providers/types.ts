// Types for Groups provider

import {
  QueryGroupsArgs,
  MutationCreateGroupArgs,
  MutationUpdateGroupArgs,
  MutationDeleteGroupArgs,
  Group,
  GroupPage,
} from '@/graphql/generated/types';

export type GetGroupsParams = QueryGroupsArgs;
export type GetGroupsResult = GroupPage;

export type CreateGroupParams = MutationCreateGroupArgs;
export type CreateGroupResult = Group;

export type UpdateGroupParams = MutationUpdateGroupArgs;
export type UpdateGroupResult = Group;

export type DeleteGroupParams = MutationDeleteGroupArgs;
export type DeleteGroupResult = boolean;

export interface GroupDataProvider {
  getGroups(params: GetGroupsParams): Promise<GetGroupsResult>;
  createGroup(params: CreateGroupParams): Promise<CreateGroupResult>;
  updateGroup(params: UpdateGroupParams): Promise<UpdateGroupResult>;
  deleteGroup(params: DeleteGroupParams): Promise<DeleteGroupResult>;
}
