import * as authMutations from './auth/mutations';
import * as groupPermissionMutations from './group-permissions/mutations';
import * as groupTagMutations from './group-tags/mutations';
import * as groupMutations from './groups/mutations';
import * as organizationGroupMutations from './organization-groups/mutations';
import * as organizationPermissionMutations from './organization-permissions/mutations';
import * as organizationProjectMutations from './organization-projects/mutations';
import * as organizationRoleMutations from './organization-roles/mutations';
import * as organizationTagMutations from './organization-tags/mutations';
import * as organizationUserMutations from './organization-users/mutations';
import * as organizationMutations from './organizations/mutations';
import * as permissionTagMutations from './permission-tags/mutations';
import * as permissionMutations from './permissions/mutations';
import * as projectGroupMutations from './project-groups/mutations';
import * as projectPermissionMutations from './project-permissions/mutations';
import * as projectRoleMutations from './project-roles/mutations';
import * as projectTagMutations from './project-tags/mutations';
import * as projectUserMutations from './project-users/mutations';
import * as projectMutations from './projects/mutations';
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
  createOrganization: organizationMutations.createOrganization,
  updateOrganization: organizationMutations.updateOrganization,
  deleteOrganization: organizationMutations.deleteOrganization,
  createProject: projectMutations.createProject,
  updateProject: projectMutations.updateProject,
  deleteProject: projectMutations.deleteProject,
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
  addPermissionTag: permissionTagMutations.addPermissionTag,
  removePermissionTag: permissionTagMutations.removePermissionTag,
  addOrganizationProject: organizationProjectMutations.addOrganizationProject,
  removeOrganizationProject: organizationProjectMutations.removeOrganizationProject,
  addOrganizationRole: organizationRoleMutations.addOrganizationRole,
  removeOrganizationRole: organizationRoleMutations.removeOrganizationRole,
  addOrganizationGroup: organizationGroupMutations.addOrganizationGroup,
  removeOrganizationGroup: organizationGroupMutations.removeOrganizationGroup,
  addOrganizationPermission: organizationPermissionMutations.addOrganizationPermission,
  removeOrganizationPermission: organizationPermissionMutations.removeOrganizationPermission,
  addOrganizationUser: organizationUserMutations.addOrganizationUser,
  removeOrganizationUser: organizationUserMutations.removeOrganizationUser,
  addOrganizationTag: organizationTagMutations.addOrganizationTag,
  removeOrganizationTag: organizationTagMutations.removeOrganizationTag,
  addProjectRole: projectRoleMutations.addProjectRole,
  removeProjectRole: projectRoleMutations.removeProjectRole,
  addProjectGroup: projectGroupMutations.addProjectGroup,
  removeProjectGroup: projectGroupMutations.removeProjectGroup,
  addProjectPermission: projectPermissionMutations.addProjectPermission,
  removeProjectPermission: projectPermissionMutations.removeProjectPermission,
  addProjectUser: projectUserMutations.addProjectUser,
  removeProjectUser: projectUserMutations.removeProjectUser,
  addProjectTag: projectTagMutations.addProjectTag,
  removeProjectTag: projectTagMutations.removeProjectTag,
} as const;
