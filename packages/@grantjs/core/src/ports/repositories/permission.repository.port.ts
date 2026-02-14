/**
 * Permission-domain repository port interfaces.
 * Implementations (Drizzle-based) live in apps/api.
 */
import type { SelectedFields } from './common';
import type {
  AddPermissionTagInput,
  CreatePermissionInput,
  MutationDeletePermissionArgs,
  MutationUpdatePermissionArgs,
  Permission,
  PermissionPage,
  PermissionTag,
  QueryPermissionTagsInput,
  QueryPermissionsArgs,
  RemovePermissionTagInput,
  UpdatePermissionTagInput,
} from '@grantjs/schema';

export interface IPermissionRepository {
  getPermissions(
    params: Omit<QueryPermissionsArgs, 'scope' | 'tagIds'> & SelectedFields<Permission>,
    transaction?: unknown
  ): Promise<PermissionPage>;

  createPermission(
    params: Omit<CreatePermissionInput, 'scope' | 'tagIds'>,
    transaction?: unknown
  ): Promise<Permission>;

  updatePermission(
    params: MutationUpdatePermissionArgs,
    transaction?: unknown
  ): Promise<Permission>;

  softDeletePermission(
    params: Omit<MutationDeletePermissionArgs, 'scope'>,
    transaction?: unknown
  ): Promise<Permission>;

  hardDeletePermission(
    params: Omit<MutationDeletePermissionArgs, 'scope'>,
    transaction?: unknown
  ): Promise<Permission>;

  getPermissionsByResourceId(resourceId: string, transaction?: unknown): Promise<Permission[]>;
}

export interface IPermissionTagRepository {
  getPermissionTags(
    params: QueryPermissionTagsInput,
    transaction?: unknown
  ): Promise<PermissionTag[]>;
  getPermissionTag(params: QueryPermissionTagsInput, transaction?: unknown): Promise<PermissionTag>;
  getPermissionTagIntersection(
    permissionIds: string[],
    tagIds: string[],
    transaction?: unknown
  ): Promise<PermissionTag[]>;
  addPermissionTag(params: AddPermissionTagInput, transaction?: unknown): Promise<PermissionTag>;
  updatePermissionTag(
    params: UpdatePermissionTagInput,
    transaction?: unknown
  ): Promise<PermissionTag>;
  softDeletePermissionTag(
    params: RemovePermissionTagInput,
    transaction?: unknown
  ): Promise<PermissionTag>;
  hardDeletePermissionTag(
    params: RemovePermissionTagInput,
    transaction?: unknown
  ): Promise<PermissionTag>;
}
