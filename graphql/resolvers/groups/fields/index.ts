import { groupPermissionsResolver as permissions } from './permissions';
import { groupTagsResolver as tags } from './tags';

export const groupResolver = {
  permissions,
  tags,
};
