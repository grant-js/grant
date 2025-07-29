import { addUserRole } from '@/graphql/providers/user-roles/faker/addUserRole';
import { getUserRoles } from '@/graphql/providers/user-roles/faker/getUserRoles';
import { removeUserRole } from '@/graphql/providers/user-roles/faker/removeUserRole';
import { UserRoleDataProvider } from '@/graphql/providers/user-roles/types';

export const userRoleFakerProvider: UserRoleDataProvider = {
  getUserRoles,
  addUserRole,
  removeUserRole,
};
