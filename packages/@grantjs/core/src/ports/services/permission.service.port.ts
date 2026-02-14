/**
 * Permission-domain service port interfaces.
 * Covers: Permission, PermissionTag.
 */
import type { DeleteParams } from './user.service.port';
import type { SelectedFields } from '../repositories/common';
import type {
  AddPermissionTagInput,
  CreatePermissionInput,
  MutationDeletePermissionArgs,
  Permission,
  PermissionPage,
  PermissionTag,
  QueryPermissionsArgs,
  RemovePermissionTagInput,
  UpdatePermissionInput,
  UpdatePermissionTagInput,
} from '@grantjs/schema';

// ---------------------------------------------------------------------------
// IPermissionService
// ---------------------------------------------------------------------------

export interface IPermissionService {
  getPermissions(
    params: Omit<QueryPermissionsArgs, 'scope' | 'tagIds'> & SelectedFields<Permission>
  ): Promise<PermissionPage>;

  getPermissionsByResourceId(resourceId: string, transaction?: unknown): Promise<Permission[]>;

  createPermission(
    params: Omit<CreatePermissionInput, 'scope' | 'tagIds'>,
    transaction?: unknown
  ): Promise<Permission>;

  updatePermission(
    id: string,
    input: UpdatePermissionInput,
    transaction?: unknown
  ): Promise<Permission>;

  deletePermission(
    params: Omit<MutationDeletePermissionArgs, 'scope'> & DeleteParams,
    transaction?: unknown
  ): Promise<Permission>;
}

// ---------------------------------------------------------------------------
// IPermissionTagService
// ---------------------------------------------------------------------------

export interface IPermissionTagService {
  getPermissionTags(
    params: { permissionId: string },
    transaction?: unknown
  ): Promise<PermissionTag[]>;

  getPermissionTagIntersection(
    params: { permissionIds: string[]; tagIds: string[] },
    transaction?: unknown
  ): Promise<PermissionTag[]>;

  addPermissionTag(
    params: Omit<AddPermissionTagInput, 'scope'>,
    transaction?: unknown
  ): Promise<PermissionTag>;

  updatePermissionTag(
    params: UpdatePermissionTagInput,
    transaction?: unknown
  ): Promise<PermissionTag>;

  removePermissionTag(
    params: Omit<RemovePermissionTagInput, 'scope'> & DeleteParams,
    transaction?: unknown
  ): Promise<PermissionTag>;

  removePermissionTags(
    params: { tagId: string } & DeleteParams,
    transaction?: unknown
  ): Promise<PermissionTag[]>;
}
