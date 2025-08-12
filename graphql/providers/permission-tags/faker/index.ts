import { addPermissionTag } from '@/graphql/providers/permission-tags/faker/addPermissionTag';
import { getPermissionTags } from '@/graphql/providers/permission-tags/faker/getPermissionTags';
import { removePermissionTag } from '@/graphql/providers/permission-tags/faker/removePermissionTag';
import { PermissionTagDataProvider } from '@/graphql/providers/permission-tags/types';
export const permissionTagFakerProvider: PermissionTagDataProvider = {
  getPermissionTags,
  addPermissionTag,
  removePermissionTag,
};
