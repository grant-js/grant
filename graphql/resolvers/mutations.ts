import * as authMutations from './auth/mutations';
import * as groupPermissionMutations from './group-permissions/mutations';
import * as groupTagMutations from './group-tags/mutations';
import * as groupMutations from './groups/mutations';
import * as permissionMutations from './permissions/mutations';
import * as roleGroupMutations from './role-groups/mutations';
import * as roleTagMutations from './role-tags/mutations';
import * as roleMutations from './roles/mutations';
import * as tagMutations from './tags/mutations';
import * as userRoleMutations from './user-roles/mutations';
import * as userTagMutations from './user-tags/mutations';
import * as userMutations from './users/mutations';

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
  addUserRole: userRoleMutations.addUserRole,
  removeUserRole: userRoleMutations.removeUserRole,
  addRoleGroup: roleGroupMutations.addRoleGroup,
  removeRoleGroup: roleGroupMutations.removeRoleGroup,
  addGroupPermission: groupPermissionMutations.addGroupPermission,
  removeGroupPermission: groupPermissionMutations.removeGroupPermission,
  createTag: tagMutations.createTag,
  updateTag: tagMutations.updateTag,
  deleteTag: tagMutations.deleteTag,
  addUserTag: userTagMutations.addUserTag,
  removeUserTag: userTagMutations.removeUserTag,
  addRoleTag: roleTagMutations.addRoleTag,
  removeRoleTag: roleTagMutations.removeRoleTag,
  addGroupTag: groupTagMutations.addGroupTag,
  removeGroupTag: groupTagMutations.removeGroupTag,
} as const;
