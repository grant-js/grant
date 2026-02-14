/**
 * Group-domain repository port interfaces.
 * Implementations (Drizzle-based) live in apps/api.
 */
import type { SelectedFields } from './common';
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
  QueryGroupTagsInput,
  QueryGroupsArgs,
  RemoveGroupPermissionInput,
  RemoveGroupTagInput,
  UpdateGroupInput,
  UpdateGroupTagInput,
} from '@grantjs/schema';

export interface IGroupRepository {
  getGroups(
    params: Omit<QueryGroupsArgs, 'scope'> & SelectedFields<Group>,
    transaction?: unknown
  ): Promise<GroupPage>;

  createGroup(
    params: Omit<CreateGroupInput, 'scope' | 'tagIds' | 'permissionIds'>,
    transaction?: unknown
  ): Promise<Group>;

  updateGroup(id: string, input: UpdateGroupInput, transaction?: unknown): Promise<Group>;

  softDeleteGroup(
    params: Omit<MutationDeleteGroupArgs, 'scope'>,
    transaction?: unknown
  ): Promise<Group>;

  hardDeleteGroup(
    params: Omit<MutationDeleteGroupArgs, 'scope'>,
    transaction?: unknown
  ): Promise<Group>;
}

export interface IGroupPermissionRepository {
  getGroupPermissions(
    params: QueryGroupPermissionsInput,
    transaction?: unknown
  ): Promise<GroupPermission[]>;
  addGroupPermission(
    params: AddGroupPermissionInput,
    transaction?: unknown
  ): Promise<GroupPermission>;
  softDeleteGroupPermission(
    params: RemoveGroupPermissionInput,
    transaction?: unknown
  ): Promise<GroupPermission>;
  hardDeleteGroupPermission(
    params: RemoveGroupPermissionInput,
    transaction?: unknown
  ): Promise<GroupPermission>;
}

export interface IGroupTagRepository {
  getGroupTags(params: QueryGroupTagsInput, transaction?: unknown): Promise<GroupTag[]>;
  getGroupTag(params: QueryGroupTagsInput, transaction?: unknown): Promise<GroupTag>;
  getGroupTagIntersection(
    groupIds: string[],
    tagIds: string[],
    transaction?: unknown
  ): Promise<GroupTag[]>;
  addGroupTag(params: AddGroupTagInput, transaction?: unknown): Promise<GroupTag>;
  updateGroupTag(params: UpdateGroupTagInput, transaction?: unknown): Promise<GroupTag>;
  softDeleteGroupTag(params: RemoveGroupTagInput, transaction?: unknown): Promise<GroupTag>;
  hardDeleteGroupTag(params: RemoveGroupTagInput, transaction?: unknown): Promise<GroupTag>;
}
