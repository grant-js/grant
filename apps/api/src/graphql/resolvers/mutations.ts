import * as accountMutations from './accounts/mutations';
import * as authMutations from './auth/mutations';
import * as groupMutations from './groups/mutations';
import * as organizationMutations from './organizations/mutations';
import * as permissionMutations from './permissions/mutations';
import * as projectMutations from './projects/mutations';
import * as roleMutations from './roles/mutations';
import * as tagMutations from './tags/mutations';
import * as userMutations from './users/mutations';
export const Mutation = {
  login: authMutations.login,
  register: authMutations.register,
  refreshSession: authMutations.refreshSession,
  updateAccount: accountMutations.updateAccount,
  deleteAccount: accountMutations.deleteAccount,
  createUser: userMutations.createUser,
  updateUser: userMutations.updateUser,
  deleteUser: userMutations.deleteUser,
  createRole: roleMutations.createRole,
  deleteRole: roleMutations.deleteRole,
  updateRole: roleMutations.updateRole,
  createGroup: groupMutations.createGroup,
  deleteGroup: groupMutations.deleteGroup,
  updateGroup: groupMutations.updateGroup,
  createOrganization: organizationMutations.createOrganization,
  updateOrganization: organizationMutations.updateOrganization,
  deleteOrganization: organizationMutations.deleteOrganization,
  createProject: projectMutations.createProject,
  updateProject: projectMutations.updateProject,
  deleteProject: projectMutations.deleteProject,
  createPermission: permissionMutations.createPermission,
  deletePermission: permissionMutations.deletePermission,
  updatePermission: permissionMutations.updatePermission,
  createTag: tagMutations.createTag,
  updateTag: tagMutations.updateTag,
  deleteTag: tagMutations.deleteTag,
} as const;
