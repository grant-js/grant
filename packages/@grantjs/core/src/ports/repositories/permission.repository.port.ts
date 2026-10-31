/**
 * Permission-domain repository port interfaces.
 * Implementations (Drizzle-based) live in apps/api.
 */
import type {
  AddPermissionTagInput,
  CreatePermissionInput,
  MutationDeletePermissionArgs,
  MutationUpdatePermissionArgs,
  Permission,
  PermissionPage,
  PermissionTag,
  QueryPermissionsArgs,
  QueryPermissionTagsInput,
  RemovePermissionTagInput,
  UpdatePermissionTagInput,
} from '@grantjs/schema';

import type { IEntityExistence, OptionalListScope, SelectedFields } from './common';

/** A live permission row reduced to what identifies it: its id, resource slug and action. */
export interface PermissionRef {
  id: string;
  resource: string;
  action: string;
}

export interface IPermissionRepository extends IEntityExistence {
  getPermissions(
    params: Omit<QueryPermissionsArgs, 'scope'> & OptionalListScope & SelectedFields<Permission>,
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

  /** The live rows among the given ids; an id with no live row is absent from the result. */
  getPermissionRefsByIds(ids: readonly string[], transaction?: unknown): Promise<PermissionRef[]>;

  /** The live rows of the given resource and action pairs (slug match is case-insensitive). */
  getPermissionRefsByActions(
    pairs: readonly { resource: string; action: string }[],
    transaction?: unknown
  ): Promise<PermissionRef[]>;
}

export interface IPermissionTagRepository {
  getPermissionTags(
    params: QueryPermissionTagsInput,
    transaction?: unknown
  ): Promise<PermissionTag[]>;
  getPermissionTagsByPermissionIds(
    permissionIds: string[],
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
