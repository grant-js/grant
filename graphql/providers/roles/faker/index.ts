import { RoleDataProvider } from '@/graphql/providers/roles/types';
import { getRoles } from '@/graphql/providers/roles/faker/getRoles';
import { createRole } from '@/graphql/providers/roles/faker/createRole';
import { updateRole } from '@/graphql/providers/roles/faker/updateRole';
import { deleteRole } from '@/graphql/providers/roles/faker/deleteRole';

export const roleFakerProvider: RoleDataProvider = {
  getRoles,
  createRole,
  updateRole,
  deleteRole,
};
