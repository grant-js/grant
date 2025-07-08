import {
  MutationAddUserRoleArgs,
  MutationRemoveUserRoleArgs,
  UserRole,
} from '@/graphql/generated/types';

export type GetUserRolesParams = { userId: string };
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
