import { permissionGroupsResolver as groups } from './groups.resolver';
import {
  permissionGroupCountResolver as groupCount,
  permissionPrimaryTagResolver as primaryTag,
  permissionTagCountResolver as tagCount,
  permissionUserCountResolver as userCount,
} from './primary-tag.resolver';
import { permissionResourceResolver as resource } from './resource.resolver';
import { permissionTagsResolver as tags } from './tags.resolver';
import { permissionUsersResolver as users } from './users.resolver';

export const permissionResolver = {
  resource,
  groups,
  users,
  tags,
  primaryTag,
  groupCount,
  userCount,
  tagCount,
};
