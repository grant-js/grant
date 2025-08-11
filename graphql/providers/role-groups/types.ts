import {
  MutationAddRoleGroupArgs,
  MutationRemoveRoleGroupArgs,
  QueryRoleGroupsArgs,
  RoleGroup,
} from '@/graphql/generated/types';

export interface RoleGroupDataProvider {
  getRoleGroups(params: QueryRoleGroupsArgs): Promise<RoleGroup[]>;
  addRoleGroup(params: MutationAddRoleGroupArgs): Promise<RoleGroup>;
  removeRoleGroup(params: MutationRemoveRoleGroupArgs): Promise<RoleGroup>;
}
