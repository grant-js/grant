import { RoleDataProvider } from '@/graphql/resolvers/roles/providers/types';
import { getRoles } from './getRoles';
import { createRole } from './createRole';
import { updateRole } from './updateRole';
import { deleteRole } from './deleteRole';

export const roleFakerProvider: RoleDataProvider = {
  getRoles,
  createRole,
  updateRole,
  deleteRole,
};
