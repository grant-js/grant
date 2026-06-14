import { groupPermissionsResolver as permissions } from './permissions.resolver';
import {
  groupPermissionCountResolver as permissionCount,
  groupPrimaryTagResolver as primaryTag,
  groupTagCountResolver as tagCount,
} from './primary-tag.resolver';
import { groupTagsResolver as tags } from './tags.resolver';

export const groupResolver = {
  permissions,
  tags,
  primaryTag,
  permissionCount,
  tagCount,
};
