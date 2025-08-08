import {
  MutationAddRoleGroupArgs,
  MutationRemoveRoleGroupArgs,
  QueryRoleGroupsArgs,
  RoleGroup,
} from '@/graphql/generated/types';

export type GetRoleGroupsParams = QueryRoleGroupsArgs;
export type GetRoleGroupsResult = RoleGroup[];

export type AddRoleGroupParams = MutationAddRoleGroupArgs;
export type AddRoleGroupResult = RoleGroup;

export type RemoveRoleGroupParams = MutationRemoveRoleGroupArgs;
export type RemoveRoleGroupResult = RoleGroup;

export interface RoleGroupDataProvider {
  getRoleGroups(params: GetRoleGroupsParams): Promise<GetRoleGroupsResult>;
  addRoleGroup(params: AddRoleGroupParams): Promise<AddRoleGroupResult>;
  removeRoleGroup(params: RemoveRoleGroupParams): Promise<RemoveRoleGroupResult>;
}
