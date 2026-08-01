import { DbSchema } from '@grantjs/database';

import { AccountProjectApiKeyRepository } from './account-project-api-keys.repository';
import { AccountProjectTagRepository } from './account-project-tags.repository';
import { AccountProjectRepository } from './account-projects.repository';
import { AccountRoleRepository } from './account-roles.repository';
import { AccountTagsRepository } from './account-tags.repository';
import { AccountRepository } from './accounts.repository';
import { ApiKeyRepository } from './api-keys.repository';
import { EventLogRepository } from './event-log.repository';
import { GroupPermissionRepository } from './group-permissions.repository';
import { GroupTagRepository } from './group-tags.repository';
import { GroupRepository } from './groups.repository';
import { NotificationPreferenceRepository } from './notification-preferences.repository';
import { NotificationRepository } from './notifications.repository';
import { OrganizationGroupRepository } from './organization-groups.repository';
import { OrganizationInvitationRepository } from './organization-invitations.repository';
import { OrganizationMemberRepository } from './organization-members.repository';
import { OrganizationPermissionRepository } from './organization-permissions.repository';
import { OrganizationProjectApiKeyRepository } from './organization-project-api-keys.repository';
import { OrganizationProjectTagRepository } from './organization-project-tags.repository';
import { OrganizationProjectRepository } from './organization-projects.repository';
import { OrganizationRoleRepository } from './organization-roles.repository';
import { OrganizationTagRepository } from './organization-tags.repository';
import { OrganizationUserRepository } from './organization-users.repository';
import { OrganizationRepository } from './organizations.repository';
import { PermissionTagRepository } from './permission-tags.repository';
import { PermissionRepository } from './permissions.repository';
import { ProjectAppTagRepository } from './project-app-tags.repository';
import { ProjectAppRepository } from './project-apps.repository';
import { ProjectExportRepository } from './project-export.repository';
import { ProjectGroupRepository } from './project-groups.repository';
import { ProjectImportRepository } from './project-import.repository';
import { ProjectPermissionRepository } from './project-permissions.repository';
import { ProjectResourceRepository } from './project-resources.repository';
import { ProjectRolePermissionRepository } from './project-role-permissions.repository';
import { ProjectRoleRepository } from './project-roles.repository';
import { ProjectSyncJobRepository } from './project-sync-job.repository';
import { ProjectTagRepository } from './project-tags.repository';
import { ProjectUserApiKeyRepository } from './project-user-api-keys.repository';
import { ProjectUserGroupRepository } from './project-user-groups.repository';
import { ProjectUserPermissionRepository } from './project-user-permissions.repository';
import { ProjectUserRepository } from './project-users.repository';
import { ProjectRepository } from './projects.repository';
import { ResourceTagRepository } from './resource-tags.repository';
import { ResourceRepository } from './resources.repository';
import { RoleGroupRepository } from './role-groups.repository';
import { RolePermissionRepository } from './role-permissions.repository';
import { RoleTagRepository } from './role-tags.repository';
import { RoleRepository } from './roles.repository';
import { SigningKeyRepository } from './signing-keys.repository';
import { TagRepository } from './tags.repository';
import { UserAuthenticationMethodRepository } from './user-authentication-methods.repository';
import { UserGroupRepository } from './user-groups.repository';
import { UserMfaFactorRepository } from './user-mfa-factors.repository';
import { UserMfaRecoveryCodeRepository } from './user-mfa-recovery-codes.repository';
import { UserPermissionRepository } from './user-permissions.repository';
import { UserRoleRepository } from './user-roles.repository';
import { UserSessionRepository } from './user-sessions.repository';
import { UserTagRepository } from './user-tags.repository';
import { UserRepository } from './users.repository';
import { WebhookDeliveryRepository } from './webhook-deliveries.repository';
import { WebhookSubscriptionRepository } from './webhook-subscriptions.repository';

export type Repositories = ReturnType<typeof createRepositories>;

export function createRepositories(db: DbSchema) {
  return {
    accountProjectApiKeyRepository: new AccountProjectApiKeyRepository(db),
    accountProjectRepository: new AccountProjectRepository(db),
    accountProjectTagRepository: new AccountProjectTagRepository(db),
    accountRoleRepository: new AccountRoleRepository(db),
    accountRepository: new AccountRepository(db),
    accountTagsRepository: new AccountTagsRepository(db),
    apiKeyRepository: new ApiKeyRepository(db),
    eventLogRepository: new EventLogRepository(db),
    groupPermissionRepository: new GroupPermissionRepository(db),
    groupTagRepository: new GroupTagRepository(db),
    groupRepository: new GroupRepository(db),
    notificationRepository: new NotificationRepository(db),
    notificationPreferenceRepository: new NotificationPreferenceRepository(db),
    organizationGroupRepository: new OrganizationGroupRepository(db),
    organizationInvitationRepository: new OrganizationInvitationRepository(db),
    organizationMemberRepository: new OrganizationMemberRepository(db),
    organizationProjectApiKeyRepository: new OrganizationProjectApiKeyRepository(db),
    organizationPermissionRepository: new OrganizationPermissionRepository(db),
    organizationProjectRepository: new OrganizationProjectRepository(db),
    organizationProjectTagRepository: new OrganizationProjectTagRepository(db),
    organizationRoleRepository: new OrganizationRoleRepository(db),
    organizationTagRepository: new OrganizationTagRepository(db),
    organizationUserRepository: new OrganizationUserRepository(db),
    organizationRepository: new OrganizationRepository(db),
    permissionTagRepository: new PermissionTagRepository(db),
    permissionRepository: new PermissionRepository(db),
    projectImportRepository: new ProjectImportRepository(db),
    projectExportRepository: new ProjectExportRepository(db),
    projectSyncJobRepository: new ProjectSyncJobRepository(db),
    projectAppRepository: new ProjectAppRepository(db),
    projectAppTagRepository: new ProjectAppTagRepository(db),
    projectGroupRepository: new ProjectGroupRepository(db),
    projectPermissionRepository: new ProjectPermissionRepository(db),
    projectResourceRepository: new ProjectResourceRepository(db),
    projectRoleRepository: new ProjectRoleRepository(db),
    projectRolePermissionRepository: new ProjectRolePermissionRepository(db),
    signingKeyRepository: new SigningKeyRepository(db),
    projectTagRepository: new ProjectTagRepository(db),
    projectUserApiKeyRepository: new ProjectUserApiKeyRepository(db),
    projectUserRepository: new ProjectUserRepository(db),
    projectUserPermissionRepository: new ProjectUserPermissionRepository(db),
    projectUserGroupRepository: new ProjectUserGroupRepository(db),
    projectRepository: new ProjectRepository(db),
    resourceRepository: new ResourceRepository(db),
    resourceTagRepository: new ResourceTagRepository(db),
    roleGroupRepository: new RoleGroupRepository(db),
    rolePermissionRepository: new RolePermissionRepository(db),
    roleTagRepository: new RoleTagRepository(db),
    roleRepository: new RoleRepository(db),
    tagRepository: new TagRepository(db),
    userAuthenticationMethodRepository: new UserAuthenticationMethodRepository(db),
    userMfaFactorRepository: new UserMfaFactorRepository(db),
    userMfaRecoveryCodeRepository: new UserMfaRecoveryCodeRepository(db),
    userRoleRepository: new UserRoleRepository(db),
    userPermissionRepository: new UserPermissionRepository(db),
    userGroupRepository: new UserGroupRepository(db),
    userTagRepository: new UserTagRepository(db),
    userRepository: new UserRepository(db),
    userSessionRepository: new UserSessionRepository(db),
    webhookSubscriptionRepository: new WebhookSubscriptionRepository(db),
    webhookDeliveryRepository: new WebhookDeliveryRepository(db),
  };
}
