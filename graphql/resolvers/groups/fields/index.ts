import { groupPermissionsResolver } from './permissions';
import { groupTagsResolver } from './tags';

export const Group = {
  permissions: groupPermissionsResolver,
  tags: groupTagsResolver,
};
