import { createRole } from '@/graphql/providers/roles/faker/createRole';
import { deleteRole } from '@/graphql/providers/roles/faker/deleteRole';
import { getRoles } from '@/graphql/providers/roles/faker/getRoles';
import { updateRole } from '@/graphql/providers/roles/faker/updateRole';
import { RoleDataProvider } from '@/graphql/providers/roles/types';
export const roleFakerProvider: RoleDataProvider = {
  getRoles,
  createRole,
  updateRole,
  deleteRole,
};
