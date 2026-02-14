/**
 * Backward-compatible re-exports.
 * The canonical service port interfaces now live in ./services/*.service.port.ts.
 * This file re-exports them so existing consumers are not broken.
 */
export type { DeleteParams, IUserService } from './services/user.service.port';
export type { IRoleService } from './services/role.service.port';
export type { IPermissionService, IPermissionTagService } from './services/permission.service.port';
export type { IResourceService, IResourceTagService } from './services/resource.service.port';
export type { ITagService } from './services/tag.service.port';
export type { IGrantService } from './services/grant.service.port';
export type {
  IAccountService,
  IAccountProjectService,
  IAccountRoleService,
  IAccountTagService,
  IAccountProjectTagService,
  IAccountProjectApiKeyService,
} from './services/account.service.port';
export type {
  IApiKeyService,
  ISigningKeyService,
  SigningKeyResult,
} from './services/api-key.service.port';
export type {
  IAuthService,
  IGitHubOAuthService,
  IOAuthStateService,
  IMeService,
  GitHubUserInfo,
  GenerateStateParams,
  OAuthState,
} from './services/auth.service.port';
export type {
  IOrganizationService,
  IOrganizationUserService,
  IOrganizationRoleService,
  IOrganizationGroupService,
  IOrganizationPermissionService,
  IOrganizationProjectService,
  IOrganizationProjectTagService,
  IOrganizationProjectApiKeyService,
  IOrganizationTagService,
  IOrganizationMemberService,
  IOrganizationInvitationService,
} from './services/organization.service.port';
export type {
  IProjectService,
  IProjectUserService,
  IProjectRoleService,
  IProjectGroupService,
  IProjectPermissionService,
  IProjectResourceService,
  IProjectTagService,
  IProjectUserApiKeyService,
} from './services/project.service.port';
