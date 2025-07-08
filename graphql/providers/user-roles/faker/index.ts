import { UserRoleDataProvider } from '@/graphql/providers/user-roles/types';
import { getUserRoles } from '@/graphql/providers/user-roles/faker/getUserRoles';
import { addUserRole } from '@/graphql/providers/user-roles/faker/addUserRole';
import { removeUserRole } from '@/graphql/providers/user-roles/faker/removeUserRole';

export const userRoleFakerProvider: UserRoleDataProvider = {
  getUserRoles,
  addUserRole,
  removeUserRole,
};
