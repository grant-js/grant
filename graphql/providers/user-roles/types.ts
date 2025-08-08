import {
  MutationAddUserRoleArgs,
  MutationRemoveUserRoleArgs,
  QueryUserRolesArgs,
  UserRole,
} from '@/graphql/generated/types';

export type GetUserRolesParams = QueryUserRolesArgs;
export type GetUserRolesResult = UserRole[];

export type AddUserRoleParams = MutationAddUserRoleArgs;
export type AddUserRoleResult = UserRole;

export type RemoveUserRoleParams = MutationRemoveUserRoleArgs;
export type RemoveUserRoleResult = UserRole;

export interface UserRoleDataProvider {
  getUserRoles(params: GetUserRolesParams): Promise<GetUserRolesResult>;
  addUserRole(params: AddUserRoleParams): Promise<AddUserRoleResult>;
  removeUserRole(params: RemoveUserRoleParams): Promise<RemoveUserRoleResult>;
}
