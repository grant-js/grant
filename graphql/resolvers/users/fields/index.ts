import { userRolesResolver as roles } from './roles';
import { userTagsResolver as tags } from './tags';

export const userResolver = {
  tags,
  roles,
};
