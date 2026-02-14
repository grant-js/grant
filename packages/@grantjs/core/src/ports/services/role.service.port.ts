/**
 * Role-domain service port interfaces.
 * Covers: Role, RoleGroup, RoleTag.
 */
import type { DeleteParams } from './user.service.port';
import type { SelectedFields } from '../repositories/common';
import type {
  AddRoleGroupInput,
  AddRoleTagInput,
  CreateRoleInput,
  MutationDeleteRoleArgs,
  QueryRoleGroupsInput,
  QueryRolesArgs,
  RemoveRoleGroupInput,
  RemoveRoleTagInput,
  Role,
  RoleGroup,
  RolePage,
  RoleTag,
  UpdateRoleInput,
  UpdateRoleTagInput,
} from '@grantjs/schema';

// ---------------------------------------------------------------------------
// IRoleService
// ---------------------------------------------------------------------------

export interface IRoleService {
  getRoles(
    params: Omit<QueryRolesArgs, 'scope' | 'tagIds'> & SelectedFields<Role>
  ): Promise<RolePage>;

  createRole(
    params: Omit<CreateRoleInput, 'scope' | 'tagIds' | 'groupIds'>,
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

  addRoleGroup(params: AddRoleGroupInput, transaction?: unknown): Promise<RoleGroup>;

  removeRoleGroup(
    params: RemoveRoleGroupInput & DeleteParams,
    transaction?: unknown
  ): Promise<RoleGroup>;
}

// ---------------------------------------------------------------------------
// IRoleTagService
// ---------------------------------------------------------------------------

export interface IRoleTagService {
  getRoleTags(params: { roleId: string }, transaction?: unknown): Promise<RoleTag[]>;

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
