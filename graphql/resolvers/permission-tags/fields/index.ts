import { permissionTagPermissionResolver } from '@/graphql/resolvers/permission-tags/fields/permission';
import { permissionTagTagResolver } from '@/graphql/resolvers/permission-tags/fields/tag';

export const PermissionTag = {
  permission: permissionTagPermissionResolver,
  tag: permissionTagTagResolver,
};
