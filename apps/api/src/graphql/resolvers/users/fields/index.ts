import { userGroupsResolver as userGroups } from './groups.resolver';
import { userPermissionsResolver as userPermissions } from './permissions.resolver';
import {
  userPermissionCountResolver as permissionCount,
  userPrimaryTagResolver as primaryTag,
  userProjectUserApiKeyCountResolver as projectUserApiKeyCount,
  userRoleCountResolver as roleCount,
  userTagCountResolver as tagCount,
} from './primary-tag.resolver';
import { userRolesResolver as roles } from './roles.resolver';
import { userTagsResolver as tags } from './tags.resolver';

export const userResolver = {
  tags,
  roles,
  userGroups,
  userPermissions,
  primaryTag,
  roleCount,
  permissionCount,
  projectUserApiKeyCount,
  tagCount,
};
