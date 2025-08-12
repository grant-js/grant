import { addGroupPermission } from '@/graphql/providers/group-permissions/faker/addGroupPermission';
import { getGroupPermissions } from '@/graphql/providers/group-permissions/faker/getGroupPermissions';
import { removeGroupPermission } from '@/graphql/providers/group-permissions/faker/removeGroupPermission';
import { GroupPermissionDataProvider } from '@/graphql/providers/group-permissions/types';
export const groupPermissionFakerProvider: GroupPermissionDataProvider = {
  getGroupPermissions,
  addGroupPermission,
  removeGroupPermission,
};
