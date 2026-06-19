/**
 * Role-domain repository port interfaces.
 * Implementations (Drizzle-based) live in apps/api.
 */
import type {
  AddRoleGroupInput,
  AddRoleTagInput,
  AssignRolePermissionInput,
  CreateRoleInput,
  MutationDeleteRoleArgs,
  QueryRoleGroupsInput,
  QueryRolePermissionsInput,
  QueryRolesArgs,
  QueryRoleTagsInput,
  RemoveRoleGroupInput,
  RemoveRoleTagInput,
  RevokeRolePermissionInput,
  Role,
  RoleGroup,
  RolePage,
  RolePermission,
  RoleTag,
  UpdateRoleInput,
  UpdateRoleTagInput,
} from '@grantjs/schema';

import type { SelectedFields } from './common';

export interface IRoleRepository {
  getRoles(
    params: Omit<QueryRolesArgs, 'scope' | 'tagIds'> & SelectedFields<Role>,
    transaction?: unknown
  ): Promise<RolePage>;

  createRole(
    params: Omit<CreateRoleInput, 'scope' | 'tagIds' | 'groupIds'> & { searchDocument?: string },
    transaction?: unknown
  ): Promise<Role>;

  updateRole(id: string, input: UpdateRoleInput, transaction?: unknown): Promise<Role>;

  softDeleteRole(
    params: Omit<MutationDeleteRoleArgs, 'scope'>,
    transaction?: unknown
  ): Promise<Role>;

  hardDeleteRole(
    params: Omit<MutationDeleteRoleArgs, 'scope'>,
    transaction?: unknown
  ): Promise<Role>;
}

export interface IRoleGroupRepository {
  getRoleGroups(params: QueryRoleGroupsInput, transaction?: unknown): Promise<RoleGroup[]>;
  countRoleGroups(params: { roleId: string }, transaction?: unknown): Promise<number>;
  countRoleGroupsByRoleIds(roleIds: string[], transaction?: unknown): Promise<Map<string, number>>;
  addRoleGroup(params: AddRoleGroupInput, transaction?: unknown): Promise<RoleGroup>;
  softDeleteRoleGroup(params: RemoveRoleGroupInput, transaction?: unknown): Promise<RoleGroup>;
  hardDeleteRoleGroup(params: RemoveRoleGroupInput, transaction?: unknown): Promise<RoleGroup>;
}

export interface IRolePermissionRepository {
  getRolePermissions(
    params: QueryRolePermissionsInput,
    transaction?: unknown
  ): Promise<RolePermission[]>;
  countRolePermissions(params: { roleId: string }, transaction?: unknown): Promise<number>;
  countRolePermissionsByRoleIds(
    roleIds: string[],
    transaction?: unknown
  ): Promise<Map<string, number>>;
  addRolePermission(
    params: AssignRolePermissionInput,
    transaction?: unknown
  ): Promise<RolePermission>;
  softDeleteRolePermission(
    params: RevokeRolePermissionInput,
    transaction?: unknown
  ): Promise<RolePermission>;
  hardDeleteRolePermission(
    params: RevokeRolePermissionInput,
    transaction?: unknown
  ): Promise<RolePermission>;
}

export interface IRoleTagRepository {
  getRoleTags(params: QueryRoleTagsInput, transaction?: unknown): Promise<RoleTag[]>;
  getRoleTagsByRoleIds(roleIds: string[], transaction?: unknown): Promise<RoleTag[]>;
  getRoleTag(params: QueryRoleTagsInput, transaction?: unknown): Promise<RoleTag>;
  getRoleTagIntersection(
    roleIds: string[],
    tagIds: string[],
    transaction?: unknown
  ): Promise<RoleTag[]>;
  addRoleTag(params: AddRoleTagInput, transaction?: unknown): Promise<RoleTag>;
  updateRoleTag(params: UpdateRoleTagInput, transaction?: unknown): Promise<RoleTag>;
  softDeleteRoleTag(params: RemoveRoleTagInput, transaction?: unknown): Promise<RoleTag>;
  hardDeleteRoleTag(params: RemoveRoleTagInput, transaction?: unknown): Promise<RoleTag>;
}
