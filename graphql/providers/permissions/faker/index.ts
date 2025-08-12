import { createPermission } from '@/graphql/providers/permissions/faker/createPermission';
import { deletePermission } from '@/graphql/providers/permissions/faker/deletePermission';
import { getPermissions } from '@/graphql/providers/permissions/faker/getPermissions';
import { updatePermission } from '@/graphql/providers/permissions/faker/updatePermission';
import { PermissionDataProvider } from '@/graphql/providers/permissions/types';
export const permissionFakerProvider: PermissionDataProvider = {
  getPermissions,
  createPermission,
  updatePermission,
  deletePermission,
};
