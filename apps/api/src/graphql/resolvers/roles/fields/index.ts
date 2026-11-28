import { roleGroupsResolver as groups } from './groups.resolver';
import { rolePermissionsResolver as rolePermissions } from './permissions.resolver';
import {
  roleGroupCountResolver as groupCount,
  rolePermissionCountResolver as permissionCount,
  rolePrimaryTagResolver as primaryTag,
  roleTagCountResolver as tagCount,
  roleUserCountResolver as userCount,
} from './primary-tag.resolver';
import { roleTagsResolver as tags } from './tags.resolver';
import { roleUsersResolver as users } from './users.resolver';

export const roleResolver = {
  tags,
  groups,
  users,
  rolePermissions,
  primaryTag,
  groupCount,
  permissionCount,
  userCount,
  tagCount,
};
