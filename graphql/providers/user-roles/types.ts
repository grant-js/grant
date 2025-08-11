import {
  MutationAddUserRoleArgs,
  MutationRemoveUserRoleArgs,
  QueryUserRolesArgs,
  UserRole,
} from '@/graphql/generated/types';

export interface UserRoleDataProvider {
  getUserRoles(params: QueryUserRolesArgs): Promise<UserRole[]>;
  addUserRole(params: MutationAddUserRoleArgs): Promise<UserRole>;
  removeUserRole(params: MutationRemoveUserRoleArgs): Promise<UserRole>;
}
