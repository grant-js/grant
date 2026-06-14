import { roleGroupsResolver as groups } from './groups.resolver';
import { rolePermissionsResolver as rolePermissions } from './permissions.resolver';
import {
  roleGroupCountResolver as groupCount,
  rolePermissionCountResolver as permissionCount,
  rolePrimaryTagResolver as primaryTag,
  roleTagCountResolver as tagCount,
} from './primary-tag.resolver';
import { roleTagsResolver as tags } from './tags.resolver';

export const roleResolver = {
  tags,
  groups,
  rolePermissions,
  primaryTag,
  groupCount,
  permissionCount,
  tagCount,
};
