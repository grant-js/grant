import {
  permissionPrimaryTagResolver as primaryTag,
  permissionTagCountResolver as tagCount,
} from './primary-tag.resolver';
import { permissionResourceResolver as resource } from './resource.resolver';
import { permissionTagsResolver as tags } from './tags.resolver';

export const permissionResolver = {
  resource,
  tags,
  primaryTag,
  tagCount,
};
