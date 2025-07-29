import { roleGroupsResolver } from './groups';
import { roleTagsResolver } from './tags';

export const Role = {
  groups: roleGroupsResolver,
  tags: roleTagsResolver,
};
