import * as accountMutations from './accounts/mutations';
import * as authMutations from './auth/mutations';
import * as groupMutations from './groups/mutations';
import * as organizationInvitationMutations from './organization-invitations/mutations';
import * as organizationMemberMutations from './organization-members/mutations';
import * as organizationMutations from './organizations/mutations';
import * as permissionMutations from './permissions/mutations';
import * as projectUserApiKeyMutations from './project-user-api-keys/mutations';
import * as projectMutations from './projects/mutations';
import * as roleMutations from './roles/mutations';
import * as tagMutations from './tags/mutations';
import * as userAuthenticationMethodMutations from './user-authentication-methods/mutations';
import * as userSessionMutations from './user-sessions/mutations';
import * as userMutations from './users/mutations';
export const Mutation = {
  login: authMutations.login,
  register: authMutations.register,
  refreshSession: authMutations.refreshSession,
  verifyEmail: authMutations.verifyEmail,
  resendVerification: authMutations.resendVerification,
  requestPasswordReset: authMutations.requestPasswordReset,
  resetPassword: authMutations.resetPassword,
  deleteAccount: accountMutations.deleteAccount,
  createComplementaryAccount: accountMutations.createComplementaryAccount,
  createUser: userMutations.createUser,
  updateUser: userMutations.updateUser,
  deleteUser: userMutations.deleteUser,
  uploadUserPicture: userMutations.uploadUserPicture,
  changePassword: userAuthenticationMethodMutations.changePassword,
  createUserAuthenticationMethod: userAuthenticationMethodMutations.createUserAuthenticationMethod,
  deleteUserAuthenticationMethod: userAuthenticationMethodMutations.deleteUserAuthenticationMethod,
  setPrimaryAuthenticationMethod: userAuthenticationMethodMutations.setPrimaryAuthenticationMethod,
  createRole: roleMutations.createRole,
  deleteRole: roleMutations.deleteRole,
  updateRole: roleMutations.updateRole,
  createGroup: groupMutations.createGroup,
  deleteGroup: groupMutations.deleteGroup,
  updateGroup: groupMutations.updateGroup,
  createOrganization: organizationMutations.createOrganization,
  updateOrganization: organizationMutations.updateOrganization,
  deleteOrganization: organizationMutations.deleteOrganization,
  inviteMember: organizationInvitationMutations.inviteMember,
  acceptInvitation: organizationInvitationMutations.acceptInvitation,
  resendInvitationEmail: organizationInvitationMutations.resendInvitationEmail,
  revokeInvitation: organizationInvitationMutations.revokeInvitation,
  updateOrganizationMember: organizationMemberMutations.updateOrganizationMember,
  removeOrganizationMember: organizationMemberMutations.removeOrganizationMember,
  createProject: projectMutations.createProject,
  updateProject: projectMutations.updateProject,
  deleteProject: projectMutations.deleteProject,
  createPermission: permissionMutations.createPermission,
  deletePermission: permissionMutations.deletePermission,
  updatePermission: permissionMutations.updatePermission,
  createTag: tagMutations.createTag,
  updateTag: tagMutations.updateTag,
  deleteTag: tagMutations.deleteTag,
  revokeUserSession: userSessionMutations.revokeUserSession,
  createProjectUserApiKey: projectUserApiKeyMutations.createProjectUserApiKey,
  exchangeProjectUserApiKey: projectUserApiKeyMutations.exchangeProjectUserApiKey,
  revokeProjectUserApiKey: projectUserApiKeyMutations.revokeProjectUserApiKey,
  deleteProjectUserApiKey: projectUserApiKeyMutations.deleteProjectUserApiKey,
} as const;
