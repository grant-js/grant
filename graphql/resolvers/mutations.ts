import * as userMutations from './users/mutations';
import * as authMutations from './auth/mutations';
import * as roleMutations from './roles/mutations';
import * as groupMutations from './groups/mutations';
import * as permissionMutations from './permissions/mutations';

export const Mutation = {
  login: authMutations.login,
  createUser: userMutations.createUser,
  updateUser: userMutations.updateUser,
  deleteUser: userMutations.deleteUser,
  createRole: roleMutations.createRole,
  deleteRole: roleMutations.deleteRole,
  updateRole: roleMutations.updateRole,
  createGroup: groupMutations.createGroup,
  deleteGroup: groupMutations.deleteGroup,
  updateGroup: groupMutations.updateGroup,
  createPermission: permissionMutations.createPermission,
  deletePermission: permissionMutations.deletePermission,
  updatePermission: permissionMutations.updatePermission,
} as const;
