/**
 * Backward-compatible re-exports.
 * The canonical service port interfaces now live in ./services/*.service.port.ts.
 * This file re-exports them so existing consumers are not broken.
 */
export type {
  IAccountProjectApiKeyService,
  IAccountProjectService,
  IAccountProjectTagService,
  IAccountRoleService,
  IAccountService,
  IAccountTagService,
} from './services/account.service.port';
export type {
  IApiKeyService,
  ISigningKeyService,
  SigningKeyResult,
} from './services/api-key.service.port';
export type {
  GenerateStateParams,
  GitHubUserInfo,
  IAuthService,
  IGitHubOAuthService,
  IMeService,
  IOAuthStateService,
  OAuthState,
} from './services/auth.service.port';
export type { IGrantService } from './services/grant.service.port';
export type {
  IOrganizationGroupService,
  IOrganizationInvitationService,
  IOrganizationMemberService,
  IOrganizationPermissionService,
  IOrganizationProjectApiKeyService,
  IOrganizationProjectService,
  IOrganizationProjectTagService,
  IOrganizationRoleService,
  IOrganizationService,
  IOrganizationTagService,
  IOrganizationUserService,
} from './services/organization.service.port';
export type { IPermissionService, IPermissionTagService } from './services/permission.service.port';
export type {
  IProjectGroupService,
  IProjectPermissionService,
  IProjectPermissionSyncService,
  IProjectResourceService,
  IProjectRoleService,
  IProjectService,
  IProjectTagService,
  IProjectUserApiKeyService,
  IProjectUserService,
} from './services/project.service.port';
export type {
  IProjectAppService,
  IProjectAppTagService,
} from './services/project-app.service.port';
export type { IResourceService, IResourceTagService } from './services/resource.service.port';
export type { IRoleService } from './services/role.service.port';
export type { ITagService } from './services/tag.service.port';
export type { DeleteParams, IUserService } from './services/user.service.port';
