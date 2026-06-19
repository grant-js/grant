/**
 * Role-domain service port interfaces.
 * Covers: Role, RoleGroup, RoleTag.
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

import type { SelectedFields } from '../repositories/common';
import type { DeleteParams } from './user.service.port';

// ---------------------------------------------------------------------------
// IRoleService
// ---------------------------------------------------------------------------

export interface IRoleService {
  getRoles(
    params: Omit<QueryRolesArgs, 'scope' | 'tagIds'> & SelectedFields<Role>
  ): Promise<RolePage>;

  /** Resolve role by id (e.g. for ProjectApp.signUpRole). */
  getRoleById(id: string, transaction?: unknown): Promise<Role | null>;

  createRole(
    params: Omit<CreateRoleInput, 'scope' | 'tagIds' | 'groupIds'> & { searchDocument?: string },
    transaction?: unknown
  ): Promise<Role>;

  updateRole(id: string, input: UpdateRoleInput, transaction?: unknown): Promise<Role>;

  deleteRole(
    params: Omit<MutationDeleteRoleArgs, 'scope'> & DeleteParams,
    transaction?: unknown
  ): Promise<Role>;
}

// ---------------------------------------------------------------------------
// IRoleGroupService
// ---------------------------------------------------------------------------

export interface IRoleGroupService {
  getRoleGroups(params: QueryRoleGroupsInput, transaction?: unknown): Promise<RoleGroup[]>;

  countRoleGroups(params: { roleId: string }, transaction?: unknown): Promise<number>;

  countRoleGroupsByRoleIds(roleIds: string[], transaction?: unknown): Promise<Map<string, number>>;

  addRoleGroup(params: AddRoleGroupInput, transaction?: unknown): Promise<RoleGroup>;

  removeRoleGroup(
    params: RemoveRoleGroupInput & DeleteParams,
    transaction?: unknown
  ): Promise<RoleGroup>;
}

// ---------------------------------------------------------------------------
// IRolePermissionService
// ---------------------------------------------------------------------------

export interface IRolePermissionService {
  getRolePermissions(
    params: QueryRolePermissionsInput,
    transaction?: unknown
  ): Promise<RolePermission[]>;

  countRolePermissions(params: { roleId: string }, transaction?: unknown): Promise<number>;

  countRolePermissionsByRoleIds(
    roleIds: string[],
    transaction?: unknown
  ): Promise<Map<string, number>>;

  assignRolePermission(
    params: AssignRolePermissionInput,
    transaction?: unknown
  ): Promise<RolePermission>;

  revokeRolePermission(
    params: RevokeRolePermissionInput & DeleteParams,
    transaction?: unknown
  ): Promise<RolePermission>;
}

// ---------------------------------------------------------------------------
// IRoleTagService
// ---------------------------------------------------------------------------

export interface IRoleTagService {
  getRoleTags(params: { roleId: string }, transaction?: unknown): Promise<RoleTag[]>;

  getRoleTagsByRoleIds(roleIds: string[], transaction?: unknown): Promise<RoleTag[]>;

  getRoleTagIntersection(
    params: { roleIds: string[]; tagIds: string[] },
    transaction?: unknown
  ): Promise<RoleTag[]>;

  addRoleTag(params: AddRoleTagInput, transaction?: unknown): Promise<RoleTag>;

  updateRoleTag(params: UpdateRoleTagInput, transaction?: unknown): Promise<RoleTag>;

  removeRoleTag(params: RemoveRoleTagInput & DeleteParams, transaction?: unknown): Promise<RoleTag>;

  removeRoleTags(
    params: { tagId: string } & DeleteParams,
    transaction?: unknown
  ): Promise<RoleTag[]>;
}
