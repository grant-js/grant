import { userRolesResolver as roles } from './roles.resolver';
import { userTagsResolver as tags } from './tags.resolver';

export const userResolver = {
  tags,
  roles,
};
