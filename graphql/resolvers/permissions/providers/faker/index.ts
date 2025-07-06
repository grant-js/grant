import { PermissionDataProvider } from '@/graphql/resolvers/permissions/providers/types';
import { getPermissions } from './getPermissions';
import { createPermission } from './createPermission';
import { updatePermission } from './updatePermission';
import { deletePermission } from './deletePermission';

export const permissionFakerProvider: PermissionDataProvider = {
  getPermissions,
  createPermission,
  updatePermission,
  deletePermission,
};
