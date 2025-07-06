// Types for Permissions provider

import {
  QueryPermissionsArgs,
  MutationCreatePermissionArgs,
  MutationUpdatePermissionArgs,
  MutationDeletePermissionArgs,
  Permission,
  PermissionPage,
} from '@/graphql/generated/types';

export type GetPermissionsParams = QueryPermissionsArgs;
export type GetPermissionsResult = PermissionPage;

export type CreatePermissionParams = MutationCreatePermissionArgs;
export type CreatePermissionResult = Permission;

export type UpdatePermissionParams = MutationUpdatePermissionArgs;
export type UpdatePermissionResult = Permission;

export type DeletePermissionParams = MutationDeletePermissionArgs;
export type DeletePermissionResult = boolean;

export interface PermissionDataProvider {
  getPermissions(params: GetPermissionsParams): Promise<GetPermissionsResult>;
  createPermission(params: CreatePermissionParams): Promise<CreatePermissionResult>;
  updatePermission(params: UpdatePermissionParams): Promise<UpdatePermissionResult>;
  deletePermission(params: DeletePermissionParams): Promise<DeletePermissionResult>;
}
