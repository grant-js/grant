import { userRoleRoleResolver } from './role';
import { userRoleUserResolver } from './user';

export const UserRole = {
  user: userRoleUserResolver,
  role: userRoleRoleResolver,
};
