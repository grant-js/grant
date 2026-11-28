import { groupPermissionsResolver as permissions } from './permissions.resolver';
import {
  groupPermissionCountResolver as permissionCount,
  groupPrimaryTagResolver as primaryTag,
  groupRoleCountResolver as roleCount,
  groupTagCountResolver as tagCount,
  groupUserCountResolver as userCount,
} from './primary-tag.resolver';
import { groupRolesResolver as roles } from './roles.resolver';
import { groupTagsResolver as tags } from './tags.resolver';
import { groupUsersResolver as users } from './users.resolver';

export const groupResolver = {
  permissions,
  tags,
  primaryTag,
  permissionCount,
  roles,
  roleCount,
  users,
  userCount,
  tagCount,
};
