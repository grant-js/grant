import {
  MutationAddGroupPermissionArgs,
  MutationRemoveGroupPermissionArgs,
  GroupPermission,
  QueryGroupPermissionsArgs,
} from '@/graphql/generated/types';

export interface GroupPermissionDataProvider {
  getGroupPermissions(params: QueryGroupPermissionsArgs): Promise<GroupPermission[]>;
  addGroupPermission(params: MutationAddGroupPermissionArgs): Promise<GroupPermission>;
  removeGroupPermission(params: MutationRemoveGroupPermissionArgs): Promise<GroupPermission>;
}
