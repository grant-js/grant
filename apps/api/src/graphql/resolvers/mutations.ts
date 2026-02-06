import { ResourceAction, ResourceSlug } from '@grantjs/constants';

import {
  authenticateGraphQLResolver,
  authorizeGraphQLResolver,
  requireEmailVerificationGraphQL,
  type EmailVerificationGraphQLGuardOptions,
} from '@/lib/authorization';

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

const ALLOW_PERSONAL: EmailVerificationGraphQLGuardOptions = { allowPersonalContext: true };
const BLOCK_UNVERIFIED: EmailVerificationGraphQLGuardOptions = { allowPersonalContext: false };

export const Mutation = {
  // Auth (public - no guards needed)
  login: authMutations.login,
  register: authMutations.register,
  refreshSession: authMutations.refreshSession,
  verifyEmail: authMutations.verifyEmail,
  resendVerification: authMutations.resendVerification,
  requestPasswordReset: authMutations.requestPasswordReset,
  resetPassword: authMutations.resetPassword,

  // Me (private - own account operations, always allowed)
  logoutMyUser: authenticateGraphQLResolver(meMutations.logoutMyUser!),
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
  uploadMyUserPicture: authenticateGraphQLResolver(meMutations.uploadMyUserPicture!),
  updateMyUser: authenticateGraphQLResolver(meMutations.updateMyUser!),

  // Users (scoped - allow personal context)
  createUser: requireEmailVerificationGraphQL(
    ALLOW_PERSONAL,
    authorizeGraphQLResolver(
      { resource: ResourceSlug.User, action: ResourceAction.Create },
      userMutations.createUser!
    )
  ),
  updateUser: requireEmailVerificationGraphQL(
    ALLOW_PERSONAL,
    authorizeGraphQLResolver(
      { resource: ResourceSlug.User, action: ResourceAction.Update },
      userMutations.updateUser!
    )
  ),
  deleteUser: requireEmailVerificationGraphQL(
    ALLOW_PERSONAL,
    authorizeGraphQLResolver(
      { resource: ResourceSlug.User, action: ResourceAction.Delete },
      userMutations.deleteUser!
    )
  ),
  uploadUserPicture: requireEmailVerificationGraphQL(
    ALLOW_PERSONAL,
    authorizeGraphQLResolver(
      { resource: ResourceSlug.User, action: ResourceAction.UploadPicture },
      userMutations.uploadUserPicture!
    )
  ),

  // Roles (scoped - allow personal context)
  createRole: requireEmailVerificationGraphQL(
    ALLOW_PERSONAL,
    authorizeGraphQLResolver(
      { resource: ResourceSlug.Role, action: ResourceAction.Create },
      roleMutations.createRole!
    )
  ),
  deleteRole: requireEmailVerificationGraphQL(
    ALLOW_PERSONAL,
    authorizeGraphQLResolver(
      { resource: ResourceSlug.Role, action: ResourceAction.Delete },
      roleMutations.deleteRole!
    )
  ),
  updateRole: requireEmailVerificationGraphQL(
    ALLOW_PERSONAL,
    authorizeGraphQLResolver(
      { resource: ResourceSlug.Role, action: ResourceAction.Update },
      roleMutations.updateRole!
    )
  ),

  // Groups (scoped - allow personal context)
  createGroup: requireEmailVerificationGraphQL(
    ALLOW_PERSONAL,
    authorizeGraphQLResolver(
      { resource: ResourceSlug.Group, action: ResourceAction.Create },
      groupMutations.createGroup!
    )
  ),
  deleteGroup: requireEmailVerificationGraphQL(
    ALLOW_PERSONAL,
    authorizeGraphQLResolver(
      { resource: ResourceSlug.Group, action: ResourceAction.Delete },
      groupMutations.deleteGroup!
    )
  ),
  updateGroup: requireEmailVerificationGraphQL(
    ALLOW_PERSONAL,
    authorizeGraphQLResolver(
      { resource: ResourceSlug.Group, action: ResourceAction.Update },
      groupMutations.updateGroup!
    )
  ),

  // Organizations (scoped - block for unverified users)
  createOrganization: requireEmailVerificationGraphQL(
    BLOCK_UNVERIFIED,
    authorizeGraphQLResolver(
      { resource: ResourceSlug.Organization, action: ResourceAction.Create },
      organizationMutations.createOrganization!
    )
  ),
  updateOrganization: requireEmailVerificationGraphQL(
    BLOCK_UNVERIFIED,
    authorizeGraphQLResolver(
      { resource: ResourceSlug.Organization, action: ResourceAction.Update },
      organizationMutations.updateOrganization!
    )
  ),
  deleteOrganization: requireEmailVerificationGraphQL(
    BLOCK_UNVERIFIED,
    authorizeGraphQLResolver(
      { resource: ResourceSlug.Organization, action: ResourceAction.Delete },
      organizationMutations.deleteOrganization!
    )
  ),

  // Organization Invitations (scoped - block for unverified users)
  inviteMember: requireEmailVerificationGraphQL(
    BLOCK_UNVERIFIED,
    authorizeGraphQLResolver(
      { resource: ResourceSlug.OrganizationInvitation, action: ResourceAction.Create },
      organizationInvitationMutations.inviteMember!
    )
  ),
  acceptInvitation: requireEmailVerificationGraphQL(
    BLOCK_UNVERIFIED,
    authorizeGraphQLResolver(
      { resource: ResourceSlug.OrganizationInvitation, action: ResourceAction.Accept },
      organizationInvitationMutations.acceptInvitation!
    )
  ),
  resendInvitationEmail: requireEmailVerificationGraphQL(
    BLOCK_UNVERIFIED,
    authorizeGraphQLResolver(
      { resource: ResourceSlug.OrganizationInvitation, action: ResourceAction.ResendEmail },
      organizationInvitationMutations.resendInvitationEmail!
    )
  ),
  renewInvitation: requireEmailVerificationGraphQL(
    BLOCK_UNVERIFIED,
    authorizeGraphQLResolver(
      { resource: ResourceSlug.OrganizationInvitation, action: ResourceAction.Renew },
      organizationInvitationMutations.renewInvitation!
    )
  ),
  revokeInvitation: requireEmailVerificationGraphQL(
    BLOCK_UNVERIFIED,
    authorizeGraphQLResolver(
      { resource: ResourceSlug.OrganizationInvitation, action: ResourceAction.Revoke },
      organizationInvitationMutations.revokeInvitation!
    )
  ),

  // Organization Members (scoped - block for unverified users)
  updateOrganizationMember: requireEmailVerificationGraphQL(
    BLOCK_UNVERIFIED,
    authorizeGraphQLResolver(
      { resource: ResourceSlug.OrganizationMember, action: ResourceAction.Update },
      organizationMemberMutations.updateOrganizationMember!
    )
  ),
  removeOrganizationMember: requireEmailVerificationGraphQL(
    BLOCK_UNVERIFIED,
    authorizeGraphQLResolver(
      { resource: ResourceSlug.OrganizationMember, action: ResourceAction.Remove },
      organizationMemberMutations.removeOrganizationMember!
    )
  ),

  // Projects (scoped - allow personal context)
  createProject: requireEmailVerificationGraphQL(
    ALLOW_PERSONAL,
    authorizeGraphQLResolver(
      { resource: ResourceSlug.Project, action: ResourceAction.Create },
      projectMutations.createProject!
    )
  ),
  updateProject: requireEmailVerificationGraphQL(
    ALLOW_PERSONAL,
    authorizeGraphQLResolver(
      {
        resource: ResourceSlug.Project,
        action: ResourceAction.Update,
        resourceResolver: 'project',
      },
      projectMutations.updateProject!
    )
  ),
  deleteProject: requireEmailVerificationGraphQL(
    ALLOW_PERSONAL,
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
  createPermission: requireEmailVerificationGraphQL(
    ALLOW_PERSONAL,
    authorizeGraphQLResolver(
      { resource: ResourceSlug.Permission, action: ResourceAction.Create },
      permissionMutations.createPermission!
    )
  ),
  deletePermission: requireEmailVerificationGraphQL(
    ALLOW_PERSONAL,
    authorizeGraphQLResolver(
      { resource: ResourceSlug.Permission, action: ResourceAction.Delete },
      permissionMutations.deletePermission!
    )
  ),
  updatePermission: requireEmailVerificationGraphQL(
    ALLOW_PERSONAL,
    authorizeGraphQLResolver(
      { resource: ResourceSlug.Permission, action: ResourceAction.Update },
      permissionMutations.updatePermission!
    )
  ),

  // Resources (scoped - allow personal context)
  createResource: requireEmailVerificationGraphQL(
    ALLOW_PERSONAL,
    authorizeGraphQLResolver(
      { resource: ResourceSlug.Resource, action: ResourceAction.Create },
      resourceMutations.createResource!
    )
  ),
  deleteResource: requireEmailVerificationGraphQL(
    ALLOW_PERSONAL,
    authorizeGraphQLResolver(
      { resource: ResourceSlug.Resource, action: ResourceAction.Delete },
      resourceMutations.deleteResource!
    )
  ),
  updateResource: requireEmailVerificationGraphQL(
    ALLOW_PERSONAL,
    authorizeGraphQLResolver(
      { resource: ResourceSlug.Resource, action: ResourceAction.Update },
      resourceMutations.updateResource!
    )
  ),

  // Tags (scoped - allow personal context)
  createTag: requireEmailVerificationGraphQL(
    ALLOW_PERSONAL,
    authorizeGraphQLResolver(
      { resource: ResourceSlug.Tag, action: ResourceAction.Create },
      tagMutations.createTag!
    )
  ),
  updateTag: requireEmailVerificationGraphQL(
    ALLOW_PERSONAL,
    authorizeGraphQLResolver(
      {
        resource: ResourceSlug.Tag,
        action: ResourceAction.Update,
        resourceResolver: 'tag',
      },
      tagMutations.updateTag!
    )
  ),
  deleteTag: requireEmailVerificationGraphQL(
    ALLOW_PERSONAL,
    authorizeGraphQLResolver(
      { resource: ResourceSlug.Tag, action: ResourceAction.Delete, resourceResolver: 'tag' },
      tagMutations.deleteTag!
    )
  ),

  // Api Keys (scoped - allow personal context)
  createApiKey: requireEmailVerificationGraphQL(
    ALLOW_PERSONAL,
    authorizeGraphQLResolver(
      { resource: ResourceSlug.ApiKey, action: ResourceAction.Create },
      apiKeyMutations.createApiKey!
    )
  ),
  exchangeApiKey: requireEmailVerificationGraphQL(
    ALLOW_PERSONAL,
    authorizeGraphQLResolver(
      { resource: ResourceSlug.ApiKey, action: ResourceAction.Exchange },
      apiKeyMutations.exchangeApiKey!
    )
  ),
  revokeApiKey: requireEmailVerificationGraphQL(
    ALLOW_PERSONAL,
    authorizeGraphQLResolver(
      { resource: ResourceSlug.ApiKey, action: ResourceAction.Revoke },
      apiKeyMutations.revokeApiKey!
    )
  ),
  deleteApiKey: requireEmailVerificationGraphQL(
    ALLOW_PERSONAL,
    authorizeGraphQLResolver(
      { resource: ResourceSlug.ApiKey, action: ResourceAction.Delete },
      apiKeyMutations.deleteApiKey!
    )
  ),
} as const;
