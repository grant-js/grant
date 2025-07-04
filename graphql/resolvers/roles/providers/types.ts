// Types for roles provider

import {
  QueryRolesArgs,
  MutationCreateRoleArgs,
  MutationUpdateRoleArgs,
  MutationDeleteRoleArgs,
  Role,
  RolePage,
} from '@/graphql/generated/types';

export type GetRolesParams = QueryRolesArgs;
export type GetRolesResult = RolePage;

export type CreateRoleParams = MutationCreateRoleArgs;
export type CreateRoleResult = Role;

export type UpdateRoleParams = MutationUpdateRoleArgs;
export type UpdateRoleResult = Role;

export type DeleteRoleParams = MutationDeleteRoleArgs;
export type DeleteRoleResult = boolean;

export interface RoleDataProvider {
  getRoles(params: GetRolesParams): Promise<GetRolesResult>;
  createRole(params: CreateRoleParams): Promise<CreateRoleResult>;
  updateRole(params: UpdateRoleParams): Promise<UpdateRoleResult>;
  deleteRole(params: DeleteRoleParams): Promise<DeleteRoleResult>;
}
