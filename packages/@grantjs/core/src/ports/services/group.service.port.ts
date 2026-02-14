/**
 * Group-domain service port interfaces.
 * Covers: Group, GroupPermission, GroupTag.
 */
import type { DeleteParams } from './user.service.port';
import type { SelectedFields } from '../repositories/common';
import type {
  AddGroupPermissionInput,
  AddGroupTagInput,
  CreateGroupInput,
  Group,
  GroupPage,
  GroupPermission,
  GroupTag,
  MutationDeleteGroupArgs,
  QueryGroupPermissionsInput,
  QueryGroupsArgs,
  RemoveGroupPermissionInput,
  RemoveGroupTagInput,
  UpdateGroupInput,
  UpdateGroupTagInput,
} from '@grantjs/schema';

// ---------------------------------------------------------------------------
// IGroupService
// ---------------------------------------------------------------------------

export interface IGroupService {
  getGroups(
    params: Omit<QueryGroupsArgs, 'scope'> & SelectedFields<Group>,
    transaction?: unknown
  ): Promise<GroupPage>;

  createGroup(
    params: Omit<CreateGroupInput, 'scope' | 'tagIds' | 'permissionIds'>,
    transaction?: unknown
  ): Promise<Group>;

  updateGroup(id: string, input: UpdateGroupInput, transaction?: unknown): Promise<Group>;

  deleteGroup(
    params: Omit<MutationDeleteGroupArgs, 'scope'> & DeleteParams,
    transaction?: unknown
  ): Promise<Group>;
}

// ---------------------------------------------------------------------------
// IGroupPermissionService
// ---------------------------------------------------------------------------

export interface IGroupPermissionService {
  getGroupPermissions(
    params: QueryGroupPermissionsInput,
    transaction?: unknown
  ): Promise<GroupPermission[]>;

  addGroupPermission(
    params: AddGroupPermissionInput,
    transaction?: unknown
  ): Promise<GroupPermission>;

  removeGroupPermission(
    params: RemoveGroupPermissionInput & DeleteParams,
    transaction?: unknown
  ): Promise<GroupPermission>;
}

// ---------------------------------------------------------------------------
// IGroupTagService
// ---------------------------------------------------------------------------

export interface IGroupTagService {
  getGroupTags(params: { groupId: string }, transaction?: unknown): Promise<GroupTag[]>;

  getGroupTagIntersection(
    params: { groupIds: string[]; tagIds: string[] },
    transaction?: unknown
  ): Promise<GroupTag[]>;

  addGroupTag(params: AddGroupTagInput, transaction?: unknown): Promise<GroupTag>;

  updateGroupTag(params: UpdateGroupTagInput, transaction?: unknown): Promise<GroupTag>;

  removeGroupTag(
    params: RemoveGroupTagInput & DeleteParams,
    transaction?: unknown
  ): Promise<GroupTag>;

  removeGroupTags(
    params: { tagId: string } & DeleteParams,
    transaction?: unknown
  ): Promise<GroupTag[]>;
}
