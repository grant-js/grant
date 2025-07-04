import * as userMutations from './users/mutations';
import * as authMutations from './auth/mutations';
import * as roleMutations from './roles/mutations';

export const Mutation = {
  login: authMutations.login,
  createUser: userMutations.createUser,
  updateUser: userMutations.updateUser,
  deleteUser: userMutations.deleteUser,
  createRole: roleMutations.createRole,
  deleteRole: roleMutations.deleteRole,
  updateRole: roleMutations.updateRole,
} as const;
