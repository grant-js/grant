import { ResourceAction, ResourceSlug } from '@grantjs/constants';

import {
  authenticateGraphQLResolver,
  authorizeGraphQLResolver,
  type EmailVerificationGraphQLGuardOptions,
  type MfaGraphQLGuardOptions,
  requireEmailThenMfaGraphQL,
} from '@/lib/authorization';

import * as apiKeyMutations from './api-keys/mutations';
import * as authMutations from './auth/mutations';
import * as groupMutations from './groups/mutations';
import * as meMutations from './me/mutations';
import * as organizationInvitationMutations from './organization-invitations/mutations';
import * as organizationMemberMutations from './organization-members/mutations';
import * as organizationMutations from './organizations/mutations';
import * as permissionMutations from './permissions/mutations';
import * as projectAppMutations from './project-apps/mutations';
import * as projectMutations from './projects/mutations';
import * as resourceMutations from './resources/mutations';
import * as roleMutations from './roles/mutations';
import * as signingKeyMutations from './signing-keys/mutations';
import * as tagMutations from './tags/mutations';
import * as userMutations from './users/mutations';

const ALLOW_PERSONAL_EMAIL: EmailVerificationGraphQLGuardOptions = { allowPersonalContext: true };
const ALLOW_PERSONAL_MFA: MfaGraphQLGuardOptions = { allowPersonalContext: true };
const BLOCK_UNVERIFIED_EMAIL: EmailVerificationGraphQLGuardOptions = {
  allowPersonalContext: false,
};
const BLOCK_UNVERIFIED_MFA: MfaGraphQLGuardOptions = { allowPersonalContext: false };

export const Mutation = {
  // Auth (public - no guards needed)
  login: authMutations.login,
  register: authMutations.register,
  refreshSession: authMutations.refreshSession,
  verifyEmail: authMutations.verifyEmail,
  resendVerification: authMutations.resendVerification,
  requestPasswordReset: authMutations.requestPasswordReset,
  resetPassword: authMutations.resetPassword,
  setupMfa: authenticateGraphQLResolver(authMutations.setupMfa!),
  verifyMfa: authenticateGraphQLResolver(authMutations.verifyMfa!),
  verifyMfaRecoveryCode: authenticateGraphQLResolver(authMutations.verifyMfaRecoveryCode!),

  // Me (private - own account operations, always allowed)
  logoutMyUser: meMutations.logoutMyUser!, // Cookie-only; no auth required
  revokeMyUserSession: authenticateGraphQLResolver(meMutations.revokeMyUserSession!),
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
  createMyMfaEnrollment: authenticateGraphQLResolver(meMutations.createMyMfaEnrollment!),
  verifyMyMfaEnrollment: authenticateGraphQLResolver(meMutations.verifyMyMfaEnrollment!),
  setMyPrimaryMfaDevice: authenticateGraphQLResolver(meMutations.setMyPrimaryMfaDevice!),
  removeMyMfaDevice: authenticateGraphQLResolver(meMutations.removeMyMfaDevice!),
  generateMyMfaRecoveryCodes: authenticateGraphQLResolver(meMutations.generateMyMfaRecoveryCodes!),
  uploadMyUserPicture: authenticateGraphQLResolver(meMutations.uploadMyUserPicture!),
  updateMyUser: authenticateGraphQLResolver(meMutations.updateMyUser!),

  // Users (scoped - allow personal context)
  createUser: requireEmailThenMfaGraphQL(
    ALLOW_PERSONAL_EMAIL,
    ALLOW_PERSONAL_MFA,
    authorizeGraphQLResolver(
      { resource: ResourceSlug.User, action: ResourceAction.Create },
      userMutations.createUser!
    )
  ),
  updateUser: requireEmailThenMfaGraphQL(
    ALLOW_PERSONAL_EMAIL,
    ALLOW_PERSONAL_MFA,
    authorizeGraphQLResolver(
      { resource: ResourceSlug.User, action: ResourceAction.Update },
      userMutations.updateUser!
    )
  ),
  deleteUser: requireEmailThenMfaGraphQL(
    ALLOW_PERSONAL_EMAIL,
    ALLOW_PERSONAL_MFA,
    authorizeGraphQLResolver(
      { resource: ResourceSlug.User, action: ResourceAction.Delete },
      userMutations.deleteUser!
    )
  ),
  uploadUserPicture: requireEmailThenMfaGraphQL(
    ALLOW_PERSONAL_EMAIL,
    ALLOW_PERSONAL_MFA,
    authorizeGraphQLResolver(
      { resource: ResourceSlug.User, action: ResourceAction.UploadPicture },
      userMutations.uploadUserPicture!
    )
  ),

  // Roles (scoped - allow personal context)
  createRole: requireEmailThenMfaGraphQL(
    ALLOW_PERSONAL_EMAIL,
    ALLOW_PERSONAL_MFA,
    authorizeGraphQLResolver(
      { resource: ResourceSlug.Role, action: ResourceAction.Create },
      roleMutations.createRole!
    )
  ),
  deleteRole: requireEmailThenMfaGraphQL(
    ALLOW_PERSONAL_EMAIL,
    ALLOW_PERSONAL_MFA,
    authorizeGraphQLResolver(
      { resource: ResourceSlug.Role, action: ResourceAction.Delete },
      roleMutations.deleteRole!
    )
  ),
  updateRole: requireEmailThenMfaGraphQL(
    ALLOW_PERSONAL_EMAIL,
    ALLOW_PERSONAL_MFA,
    authorizeGraphQLResolver(
      { resource: ResourceSlug.Role, action: ResourceAction.Update },
      roleMutations.updateRole!
    )
  ),

  // Groups (scoped - allow personal context)
  createGroup: requireEmailThenMfaGraphQL(
    ALLOW_PERSONAL_EMAIL,
    ALLOW_PERSONAL_MFA,
    authorizeGraphQLResolver(
      { resource: ResourceSlug.Group, action: ResourceAction.Create },
      groupMutations.createGroup!
    )
  ),
  deleteGroup: requireEmailThenMfaGraphQL(
    ALLOW_PERSONAL_EMAIL,
    ALLOW_PERSONAL_MFA,
    authorizeGraphQLResolver(
      { resource: ResourceSlug.Group, action: ResourceAction.Delete },
      groupMutations.deleteGroup!
    )
  ),
  updateGroup: requireEmailThenMfaGraphQL(
    ALLOW_PERSONAL_EMAIL,
    ALLOW_PERSONAL_MFA,
    authorizeGraphQLResolver(
      { resource: ResourceSlug.Group, action: ResourceAction.Update },
      groupMutations.updateGroup!
    )
  ),

  // Organizations (scoped - block for unverified users)
  createOrganization: requireEmailThenMfaGraphQL(
    BLOCK_UNVERIFIED_EMAIL,
    BLOCK_UNVERIFIED_MFA,
    authorizeGraphQLResolver(
      { resource: ResourceSlug.Organization, action: ResourceAction.Create },
      organizationMutations.createOrganization!
    )
  ),
  updateOrganization: requireEmailThenMfaGraphQL(
    BLOCK_UNVERIFIED_EMAIL,
    BLOCK_UNVERIFIED_MFA,
    authorizeGraphQLResolver(
      { resource: ResourceSlug.Organization, action: ResourceAction.Update },
      organizationMutations.updateOrganization!
    )
  ),
  deleteOrganization: requireEmailThenMfaGraphQL(
    BLOCK_UNVERIFIED_EMAIL,
    BLOCK_UNVERIFIED_MFA,
    authorizeGraphQLResolver(
      { resource: ResourceSlug.Organization, action: ResourceAction.Delete },
      organizationMutations.deleteOrganization!
    )
  ),

  // Organization Invitations (scoped - block for unverified users)
  inviteMember: requireEmailThenMfaGraphQL(
    BLOCK_UNVERIFIED_EMAIL,
    BLOCK_UNVERIFIED_MFA,
    authorizeGraphQLResolver(
      { resource: ResourceSlug.OrganizationInvitation, action: ResourceAction.Create },
      organizationInvitationMutations.inviteMember!
    )
  ),
  // Accept uses the invitation token as authorization — the user isn't an org member yet,
  // so RBAC can't apply. The handler validates token, expiry, and email independently.
  acceptInvitation: requireEmailThenMfaGraphQL(
    BLOCK_UNVERIFIED_EMAIL,
    BLOCK_UNVERIFIED_MFA,
    organizationInvitationMutations.acceptInvitation!
  ),
  resendInvitationEmail: requireEmailThenMfaGraphQL(
    BLOCK_UNVERIFIED_EMAIL,
    BLOCK_UNVERIFIED_MFA,
    authorizeGraphQLResolver(
      { resource: ResourceSlug.OrganizationInvitation, action: ResourceAction.ResendEmail },
      organizationInvitationMutations.resendInvitationEmail!
    )
  ),
  renewInvitation: requireEmailThenMfaGraphQL(
    BLOCK_UNVERIFIED_EMAIL,
    BLOCK_UNVERIFIED_MFA,
    authorizeGraphQLResolver(
      { resource: ResourceSlug.OrganizationInvitation, action: ResourceAction.Renew },
      organizationInvitationMutations.renewInvitation!
    )
  ),
  revokeInvitation: requireEmailThenMfaGraphQL(
    BLOCK_UNVERIFIED_EMAIL,
    BLOCK_UNVERIFIED_MFA,
    authorizeGraphQLResolver(
      { resource: ResourceSlug.OrganizationInvitation, action: ResourceAction.Revoke },
      organizationInvitationMutations.revokeInvitation!
    )
  ),

  // Organization Members (scoped - block for unverified users)
  updateOrganizationMember: requireEmailThenMfaGraphQL(
    BLOCK_UNVERIFIED_EMAIL,
    BLOCK_UNVERIFIED_MFA,
    authorizeGraphQLResolver(
      { resource: ResourceSlug.OrganizationMember, action: ResourceAction.Update },
      organizationMemberMutations.updateOrganizationMember!
    )
  ),
  removeOrganizationMember: requireEmailThenMfaGraphQL(
    BLOCK_UNVERIFIED_EMAIL,
    BLOCK_UNVERIFIED_MFA,
    authorizeGraphQLResolver(
      { resource: ResourceSlug.OrganizationMember, action: ResourceAction.Remove },
      organizationMemberMutations.removeOrganizationMember!
    )
  ),

  // Projects (scoped - allow personal context)
  createProject: requireEmailThenMfaGraphQL(
    ALLOW_PERSONAL_EMAIL,
    ALLOW_PERSONAL_MFA,
    authorizeGraphQLResolver(
      { resource: ResourceSlug.Project, action: ResourceAction.Create },
      projectMutations.createProject!
    )
  ),
  updateProject: requireEmailThenMfaGraphQL(
    ALLOW_PERSONAL_EMAIL,
    ALLOW_PERSONAL_MFA,
    authorizeGraphQLResolver(
      {
        resource: ResourceSlug.Project,
        action: ResourceAction.Update,
        resourceResolver: 'project',
      },
      projectMutations.updateProject!
    )
  ),
  syncProjectPermissions: requireEmailThenMfaGraphQL(
    ALLOW_PERSONAL_EMAIL,
    ALLOW_PERSONAL_MFA,
    authorizeGraphQLResolver(
      {
        resource: ResourceSlug.Project,
        action: ResourceAction.Update,
        resourceResolver: 'project',
      },
      projectMutations.syncProjectPermissions!
    )
  ),
  deleteProject: requireEmailThenMfaGraphQL(
    ALLOW_PERSONAL_EMAIL,
    ALLOW_PERSONAL_MFA,
    authorizeGraphQLResolver(
      {
        resource: ResourceSlug.Project,
        action: ResourceAction.Delete,
        resourceResolver: 'project',
      },
      projectMutations.deleteProject!
    )
  ),

  // Permissions (scoped - allow personal context)
  createPermission: requireEmailThenMfaGraphQL(
    ALLOW_PERSONAL_EMAIL,
    ALLOW_PERSONAL_MFA,
    authorizeGraphQLResolver(
      { resource: ResourceSlug.Permission, action: ResourceAction.Create },
      permissionMutations.createPermission!
    )
  ),
  deletePermission: requireEmailThenMfaGraphQL(
    ALLOW_PERSONAL_EMAIL,
    ALLOW_PERSONAL_MFA,
    authorizeGraphQLResolver(
      { resource: ResourceSlug.Permission, action: ResourceAction.Delete },
      permissionMutations.deletePermission!
    )
  ),
  updatePermission: requireEmailThenMfaGraphQL(
    ALLOW_PERSONAL_EMAIL,
    ALLOW_PERSONAL_MFA,
    authorizeGraphQLResolver(
      { resource: ResourceSlug.Permission, action: ResourceAction.Update },
      permissionMutations.updatePermission!
    )
  ),

  // Resources (scoped - allow personal context)
  createResource: requireEmailThenMfaGraphQL(
    ALLOW_PERSONAL_EMAIL,
    ALLOW_PERSONAL_MFA,
    authorizeGraphQLResolver(
      { resource: ResourceSlug.Resource, action: ResourceAction.Create },
      resourceMutations.createResource!
    )
  ),
  deleteResource: requireEmailThenMfaGraphQL(
    ALLOW_PERSONAL_EMAIL,
    ALLOW_PERSONAL_MFA,
    authorizeGraphQLResolver(
      { resource: ResourceSlug.Resource, action: ResourceAction.Delete },
      resourceMutations.deleteResource!
    )
  ),
  updateResource: requireEmailThenMfaGraphQL(
    ALLOW_PERSONAL_EMAIL,
    ALLOW_PERSONAL_MFA,
    authorizeGraphQLResolver(
      { resource: ResourceSlug.Resource, action: ResourceAction.Update },
      resourceMutations.updateResource!
    )
  ),

  // Tags (scoped - allow personal context)
  createTag: requireEmailThenMfaGraphQL(
    ALLOW_PERSONAL_EMAIL,
    ALLOW_PERSONAL_MFA,
    authorizeGraphQLResolver(
      { resource: ResourceSlug.Tag, action: ResourceAction.Create },
      tagMutations.createTag!
    )
  ),
  updateTag: requireEmailThenMfaGraphQL(
    ALLOW_PERSONAL_EMAIL,
    ALLOW_PERSONAL_MFA,
    authorizeGraphQLResolver(
      {
        resource: ResourceSlug.Tag,
        action: ResourceAction.Update,
        resourceResolver: 'tag',
      },
      tagMutations.updateTag!
    )
  ),
  deleteTag: requireEmailThenMfaGraphQL(
    ALLOW_PERSONAL_EMAIL,
    ALLOW_PERSONAL_MFA,
    authorizeGraphQLResolver(
      { resource: ResourceSlug.Tag, action: ResourceAction.Delete, resourceResolver: 'tag' },
      tagMutations.deleteTag!
    )
  ),

  // Api Keys (scoped - allow personal context)
  createApiKey: requireEmailThenMfaGraphQL(
    ALLOW_PERSONAL_EMAIL,
    ALLOW_PERSONAL_MFA,
    authorizeGraphQLResolver(
      { resource: ResourceSlug.ApiKey, action: ResourceAction.Create },
      apiKeyMutations.createApiKey!
    )
  ),
  exchangeApiKey: requireEmailThenMfaGraphQL(
    ALLOW_PERSONAL_EMAIL,
    ALLOW_PERSONAL_MFA,
    authorizeGraphQLResolver(
      { resource: ResourceSlug.ApiKey, action: ResourceAction.Exchange },
      apiKeyMutations.exchangeApiKey!
    )
  ),
  revokeApiKey: requireEmailThenMfaGraphQL(
    ALLOW_PERSONAL_EMAIL,
    ALLOW_PERSONAL_MFA,
    authorizeGraphQLResolver(
      { resource: ResourceSlug.ApiKey, action: ResourceAction.Revoke },
      apiKeyMutations.revokeApiKey!
    )
  ),
  deleteApiKey: requireEmailThenMfaGraphQL(
    ALLOW_PERSONAL_EMAIL,
    ALLOW_PERSONAL_MFA,
    authorizeGraphQLResolver(
      { resource: ResourceSlug.ApiKey, action: ResourceAction.Delete },
      apiKeyMutations.deleteApiKey!
    )
  ),

  // Signing Keys (scoped; project only – same permission as API key query for rotate)
  rotateSigningKey: requireEmailThenMfaGraphQL(
    ALLOW_PERSONAL_EMAIL,
    ALLOW_PERSONAL_MFA,
    authorizeGraphQLResolver(
      { resource: ResourceSlug.ApiKey, action: ResourceAction.Query },
      signingKeyMutations.rotateSigningKey!
    )
  ),

  // Project apps (OAuth apps per project; scoped)
  createProjectApp: requireEmailThenMfaGraphQL(
    ALLOW_PERSONAL_EMAIL,
    ALLOW_PERSONAL_MFA,
    authorizeGraphQLResolver(
      {
        resource: ResourceSlug.ProjectApp,
        action: ResourceAction.Create,
        resourceResolver: 'projectApp',
      },
      projectAppMutations.createProjectApp!
    )
  ),
  updateProjectApp: requireEmailThenMfaGraphQL(
    ALLOW_PERSONAL_EMAIL,
    ALLOW_PERSONAL_MFA,
    authorizeGraphQLResolver(
      {
        resource: ResourceSlug.ProjectApp,
        action: ResourceAction.Update,
        resourceResolver: 'projectApp',
      },
      projectAppMutations.updateProjectApp!
    )
  ),
  deleteProjectApp: requireEmailThenMfaGraphQL(
    ALLOW_PERSONAL_EMAIL,
    ALLOW_PERSONAL_MFA,
    authorizeGraphQLResolver(
      {
        resource: ResourceSlug.ProjectApp,
        action: ResourceAction.Delete,
        resourceResolver: 'projectApp',
      },
      projectAppMutations.deleteProjectApp!
    )
  ),
} as const;
