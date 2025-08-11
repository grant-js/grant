// Types for Permissions provider

import {
  QueryPermissionsArgs,
  MutationCreatePermissionArgs,
  MutationUpdatePermissionArgs,
  MutationDeletePermissionArgs,
  Permission,
  PermissionPage,
} from '@/graphql/generated/types';

export interface PermissionDataProvider {
  getPermissions(params: QueryPermissionsArgs): Promise<PermissionPage>;
  createPermission(params: MutationCreatePermissionArgs): Promise<Permission>;
  updatePermission(params: MutationUpdatePermissionArgs): Promise<Permission>;
  deletePermission(params: MutationDeletePermissionArgs): Promise<Permission>;
}
