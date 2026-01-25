import { ResourceAction, ResourceSlug } from '@grantjs/constants';

import { authenticateGraphQLResolver, authorizeGraphQLResolver } from '@/lib/authorization';

import * as apiKeyMutations from './api-keys/mutations';
import * as authMutations from './auth/mutations';
import * as groupMutations from './groups/mutations';
import * as meMutations from './me/mutations';
import * as organizationInvitationMutations from './organization-invitations/mutations';
import * as organizationMemberMutations from './organization-members/mutations';
import * as organizationMutations from './organizations/mutations';
import * as permissionMutations from './permissions/mutations';
import * as projectMutations from './projects/mutations';
import * as resourceMutations from './resources/mutations';
import * as roleMutations from './roles/mutations';
import * as tagMutations from './tags/mutations';
import * as userMutations from './users/mutations';
export const Mutation = {
  // Auth (public)
  login: authMutations.login,
  register: authMutations.register,
  refreshSession: authMutations.refreshSession,
  verifyEmail: authMutations.verifyEmail,
  resendVerification: authMutations.resendVerification,
  requestPasswordReset: authMutations.requestPasswordReset,
  resetPassword: authMutations.resetPassword,
  // Me (private)
  deleteMyAccounts: authenticateGraphQLResolver(meMutations.deleteMyAccounts!),
  createMySecondaryAccount: authenticateGraphQLResolver(meMutations.createMySecondaryAccount!),
  changeMyPassword: authenticateGraphQLResolver(meMutations.changeMyPassword!),
  createMyUserAuthenticationMethod: authenticateGraphQLResolver(
    meMutations.createMyUserAuthenticationMethod!
  ),
  deleteMyUserAuthenticationMethod: authenticateGraphQLResolver(
    meMutations.deleteMyUserAuthenticationMethod!
  ),
  setMyPrimaryAuthenticationMethod: authenticateGraphQLResolver(
    meMutations.setMyPrimaryAuthenticationMethod!
  ),
  revokeMyUserSession: authenticateGraphQLResolver(meMutations.revokeMyUserSession!),
  uploadMyUserPicture: authenticateGraphQLResolver(meMutations.uploadMyUserPicture!),
  updateMyUser: authenticateGraphQLResolver(meMutations.updateMyUser!),
  logoutMyUser: authenticateGraphQLResolver(meMutations.logoutMyUser!),
  // Users (scoped)
  createUser: authorizeGraphQLResolver(
    { resource: ResourceSlug.User, action: ResourceAction.Create },
    userMutations.createUser!
  ),
  updateUser: authorizeGraphQLResolver(
    { resource: ResourceSlug.User, action: ResourceAction.Update },
    userMutations.updateUser!
  ),
  deleteUser: authorizeGraphQLResolver(
    { resource: ResourceSlug.User, action: ResourceAction.Delete },
    userMutations.deleteUser!
  ),
  uploadUserPicture: authorizeGraphQLResolver(
    { resource: ResourceSlug.User, action: ResourceAction.UploadPicture },
    userMutations.uploadUserPicture!
  ),
  // Roles (scoped)
  createRole: authorizeGraphQLResolver(
    { resource: ResourceSlug.Role, action: ResourceAction.Create },
    roleMutations.createRole!
  ),
  deleteRole: authorizeGraphQLResolver(
    { resource: ResourceSlug.Role, action: ResourceAction.Delete },
    roleMutations.deleteRole!
  ),
  updateRole: authorizeGraphQLResolver(
    { resource: ResourceSlug.Role, action: ResourceAction.Update },
    roleMutations.updateRole!
  ),
  // Groups (scoped)
  createGroup: authorizeGraphQLResolver(
    { resource: ResourceSlug.Group, action: ResourceAction.Create },
    groupMutations.createGroup!
  ),
  deleteGroup: authorizeGraphQLResolver(
    { resource: ResourceSlug.Group, action: ResourceAction.Delete },
    groupMutations.deleteGroup!
  ),
  updateGroup: authorizeGraphQLResolver(
    { resource: ResourceSlug.Group, action: ResourceAction.Update },
    groupMutations.updateGroup!
  ),
  // Organizations (scoped)
  createOrganization: authorizeGraphQLResolver(
    { resource: ResourceSlug.Organization, action: ResourceAction.Create },
    organizationMutations.createOrganization!
  ),
  updateOrganization: authorizeGraphQLResolver(
    { resource: ResourceSlug.Organization, action: ResourceAction.Update },
    organizationMutations.updateOrganization!
  ),
  deleteOrganization: authorizeGraphQLResolver(
    { resource: ResourceSlug.Organization, action: ResourceAction.Delete },
    organizationMutations.deleteOrganization!
  ),
  // Organization Invitations (scoped)
  inviteMember: authorizeGraphQLResolver(
    { resource: ResourceSlug.OrganizationInvitation, action: ResourceAction.Create },
    organizationInvitationMutations.inviteMember!
  ),
  acceptInvitation: authorizeGraphQLResolver(
    { resource: ResourceSlug.OrganizationInvitation, action: ResourceAction.Accept },
    organizationInvitationMutations.acceptInvitation!
  ),
  resendInvitationEmail: authorizeGraphQLResolver(
    { resource: ResourceSlug.OrganizationInvitation, action: ResourceAction.ResendEmail },
    organizationInvitationMutations.resendInvitationEmail!
  ),
  renewInvitation: authorizeGraphQLResolver(
    { resource: ResourceSlug.OrganizationInvitation, action: ResourceAction.Renew },
    organizationInvitationMutations.renewInvitation!
  ),
  revokeInvitation: authorizeGraphQLResolver(
    { resource: ResourceSlug.OrganizationInvitation, action: ResourceAction.Revoke },
    organizationInvitationMutations.revokeInvitation!
  ),
  // Organization Members (scoped)
  updateOrganizationMember: authorizeGraphQLResolver(
    { resource: ResourceSlug.OrganizationMember, action: ResourceAction.Update },
    organizationMemberMutations.updateOrganizationMember!
  ),
  removeOrganizationMember: authorizeGraphQLResolver(
    { resource: ResourceSlug.OrganizationMember, action: ResourceAction.Remove },
    organizationMemberMutations.removeOrganizationMember!
  ),
  // Projects (scoped)
  createProject: authorizeGraphQLResolver(
    { resource: ResourceSlug.Project, action: ResourceAction.Create },
    projectMutations.createProject!
  ),
  updateProject: authorizeGraphQLResolver(
    { resource: ResourceSlug.Project, action: ResourceAction.Update, resourceResolver: 'project' },
    projectMutations.updateProject!
  ),
  deleteProject: authorizeGraphQLResolver(
    { resource: ResourceSlug.Project, action: ResourceAction.Delete, resourceResolver: 'project' },
    projectMutations.deleteProject!
  ),
  // Permissions (scoped)
  createPermission: authorizeGraphQLResolver(
    { resource: ResourceSlug.Permission, action: ResourceAction.Create },
    permissionMutations.createPermission!
  ),
  deletePermission: authorizeGraphQLResolver(
    { resource: ResourceSlug.Permission, action: ResourceAction.Delete },
    permissionMutations.deletePermission!
  ),
  updatePermission: authorizeGraphQLResolver(
    { resource: ResourceSlug.Permission, action: ResourceAction.Update },
    permissionMutations.updatePermission!
  ),
  // Resources (scoped)
  createResource: authorizeGraphQLResolver(
    { resource: ResourceSlug.Resource, action: ResourceAction.Create },
    resourceMutations.createResource!
  ),
  deleteResource: authorizeGraphQLResolver(
    { resource: ResourceSlug.Resource, action: ResourceAction.Delete },
    resourceMutations.deleteResource!
  ),
  updateResource: authorizeGraphQLResolver(
    { resource: ResourceSlug.Resource, action: ResourceAction.Update },
    resourceMutations.updateResource!
  ),
  // Tags (scoped)
  createTag: authorizeGraphQLResolver(
    { resource: ResourceSlug.Tag, action: ResourceAction.Create },
    tagMutations.createTag!
  ),
  updateTag: authorizeGraphQLResolver(
    { resource: ResourceSlug.Tag, action: ResourceAction.Update },
    tagMutations.updateTag!
  ),
  deleteTag: authorizeGraphQLResolver(
    { resource: ResourceSlug.Tag, action: ResourceAction.Delete },
    tagMutations.deleteTag!
  ),
  // Api Keys (scoped)
  createApiKey: authorizeGraphQLResolver(
    { resource: ResourceSlug.ApiKey, action: ResourceAction.Create },
    apiKeyMutations.createApiKey!
  ),
  exchangeApiKey: authorizeGraphQLResolver(
    { resource: ResourceSlug.ApiKey, action: ResourceAction.Exchange },
    apiKeyMutations.exchangeApiKey!
  ),
  revokeApiKey: authorizeGraphQLResolver(
    { resource: ResourceSlug.ApiKey, action: ResourceAction.Revoke },
    apiKeyMutations.revokeApiKey!
  ),
  deleteApiKey: authorizeGraphQLResolver(
    { resource: ResourceSlug.ApiKey, action: ResourceAction.Delete },
    apiKeyMutations.deleteApiKey!
  ),
} as const;
