// Types for roles provider

import {
  QueryRolesArgs,
  MutationCreateRoleArgs,
  MutationUpdateRoleArgs,
  MutationDeleteRoleArgs,
  Role,
  RolePage,
} from '@/graphql/generated/types';

export interface RoleDataProvider {
  getRoles(params: QueryRolesArgs): Promise<RolePage>;
  createRole(params: MutationCreateRoleArgs): Promise<Role>;
  updateRole(params: MutationUpdateRoleArgs): Promise<Role>;
  deleteRole(params: MutationDeleteRoleArgs): Promise<Role>;
}
