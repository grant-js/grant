/**
 * Role-domain repository port interfaces.
 * Implementations (Drizzle-based) live in apps/api.
 */
import type { SelectedFields } from './common';
import type {
  AddRoleGroupInput,
  AddRoleTagInput,
  CreateRoleInput,
  MutationDeleteRoleArgs,
  QueryRoleGroupsInput,
  QueryRoleTagsInput,
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

export interface IRoleRepository {
  getRoles(
    params: Omit<QueryRolesArgs, 'scope' | 'tagIds'> & SelectedFields<Role>,
    transaction?: unknown
  ): Promise<RolePage>;

  createRole(
    params: Omit<CreateRoleInput, 'scope' | 'tagIds' | 'groupIds'>,
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
  addRoleGroup(params: AddRoleGroupInput, transaction?: unknown): Promise<RoleGroup>;
  softDeleteRoleGroup(params: RemoveRoleGroupInput, transaction?: unknown): Promise<RoleGroup>;
  hardDeleteRoleGroup(params: RemoveRoleGroupInput, transaction?: unknown): Promise<RoleGroup>;
}

export interface IRoleTagRepository {
  getRoleTags(params: QueryRoleTagsInput, transaction?: unknown): Promise<RoleTag[]>;
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
