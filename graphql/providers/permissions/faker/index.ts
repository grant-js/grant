import { PermissionDataProvider } from '@/graphql/providers/permissions/types';
import { getPermissions } from '@/graphql/providers/permissions/faker/getPermissions';
import { createPermission } from '@/graphql/providers/permissions/faker/createPermission';
import { updatePermission } from '@/graphql/providers/permissions/faker/updatePermission';
import { deletePermission } from '@/graphql/providers/permissions/faker/deletePermission';

export const permissionFakerProvider: PermissionDataProvider = {
  getPermissions,
  createPermission,
  updatePermission,
  deletePermission,
};
