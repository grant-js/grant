import { userRolesResolver } from './roles';
import { userTagsResolver } from './tags';

export const User = {
  roles: userRolesResolver,
  tags: userTagsResolver,
};
