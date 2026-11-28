import { groupPermissionsResolver as permissions } from './permissions.resolver';
import {
  groupPermissionCountResolver as permissionCount,
  groupPrimaryTagResolver as primaryTag,
  groupTagCountResolver as tagCount,
  groupUserCountResolver as userCount,
} from './primary-tag.resolver';
import { groupTagsResolver as tags } from './tags.resolver';
import { groupUsersResolver as users } from './users.resolver';

export const groupResolver = {
  permissions,
  tags,
  primaryTag,
  permissionCount,
  users,
  userCount,
  tagCount,
};
