import { ComparisonOperator, type ConditionExpression } from '@grantjs/core';

import { GroupKey } from './groups';
import { ResourceAction, ResourceSlug, type ResourceSlug as ResourceSlugType } from './resources';

interface PermissionMapping {
  action: ResourceAction;
  resource: ResourceSlugType;
  condition: ConditionExpression | null;
  groupName: string;
}

type PermissionMappingTemplate = Omit<PermissionMapping, 'groupName'>;

const PERMISSION_MAPPING_TEMPLATES: Partial<Record<GroupKey, PermissionMappingTemplate[]>> = {
  [GroupKey.AccountCommon]: [
    {
      action: ResourceAction.Read,
      resource: ResourceSlug.Account,
      condition: null,
    },
    {
      action: ResourceAction.Query,
      resource: ResourceSlug.Account,
      condition: null,
    },
  ],

  [GroupKey.PersonalAccountOwner]: [
    {
      action: ResourceAction.Delete,
      resource: ResourceSlug.Account,
      condition: {
        [ComparisonOperator.StringEquals]: {
          'resource.id': '{{user.id}}',
        },
      },
    },
  ],

  [GroupKey.OrganizationAccountOwner]: [
    {
      action: ResourceAction.Delete,
      resource: ResourceSlug.Account,
      condition: {
        [ComparisonOperator.StringEquals]: {
          'resource.id': '{{user.id}}',
        },
      },
    },
  ],

  [GroupKey.UserCommon]: [
    {
      action: ResourceAction.Read,
      resource: ResourceSlug.User,
      condition: null,
    },
    {
      action: ResourceAction.Query,
      resource: ResourceSlug.User,
      condition: null,
    },
  ],

  [GroupKey.OrganizationCommon]: [
    {
      action: ResourceAction.Create,
      resource: ResourceSlug.Organization,
      condition: null,
    },
    {
      action: ResourceAction.Query,
      resource: ResourceSlug.Organization,
      condition: null,
    },
  ],

  [GroupKey.ProjectCommon]: [
    {
      action: ResourceAction.Query,
      resource: ResourceSlug.Project,
      condition: null,
    },
  ],

  [GroupKey.AccountProjectOwner]: [
    {
      action: ResourceAction.Create,
      resource: ResourceSlug.Project,
      condition: null,
    },
    {
      action: ResourceAction.Update,
      resource: ResourceSlug.Project,
      condition: {
        [ComparisonOperator.In]: {
          'resource.id': '{{resource.scope.projects}}',
        },
      },
    },
    {
      action: ResourceAction.Delete,
      resource: ResourceSlug.Project,
      condition: {
        [ComparisonOperator.In]: {
          'resource.id': '{{resource.scope.projects}}',
        },
      },
    },
    {
      action: ResourceAction.SetExportableApiKeySecrets,
      resource: ResourceSlug.Project,
      condition: {
        [ComparisonOperator.In]: {
          'resource.id': '{{resource.scope.projects}}',
        },
      },
    },
    {
      action: ResourceAction.Update,
      resource: ResourceSlug.Tag,
      condition: {
        [ComparisonOperator.In]: {
          'resource.id': '{{resource.scope.tags}}',
        },
      },
    },
    {
      action: ResourceAction.Delete,
      resource: ResourceSlug.Tag,
      condition: {
        [ComparisonOperator.In]: {
          'resource.id': '{{resource.scope.tags}}',
        },
      },
    },
  ],

  [GroupKey.AccountProjectUserOwner]: [
    {
      action: ResourceAction.Create,
      resource: ResourceSlug.User,
      condition: null,
    },
    {
      action: ResourceAction.Read,
      resource: ResourceSlug.User,
      condition: null,
    },
    {
      action: ResourceAction.Query,
      resource: ResourceSlug.User,
      condition: null,
    },
    {
      action: ResourceAction.Update,
      resource: ResourceSlug.User,
      condition: null,
    },
    {
      action: ResourceAction.Delete,
      resource: ResourceSlug.User,
      condition: null,
    },
    {
      action: ResourceAction.UploadPicture,
      resource: ResourceSlug.User,
      condition: null,
    },
  ],

  [GroupKey.AccountProjectResourceOwner]: [
    {
      action: ResourceAction.Create,
      resource: ResourceSlug.Resource,
      condition: null,
    },
    {
      action: ResourceAction.Query,
      resource: ResourceSlug.Resource,
      condition: null,
    },
    {
      action: ResourceAction.Update,
      resource: ResourceSlug.Resource,
      condition: null,
    },
    {
      action: ResourceAction.Delete,
      resource: ResourceSlug.Resource,
      condition: null,
    },
  ],

  [GroupKey.AccountProjectRoleOwner]: [
    {
      action: ResourceAction.Create,
      resource: ResourceSlug.Role,
      condition: null,
    },
    {
      action: ResourceAction.Read,
      resource: ResourceSlug.Role,
      condition: null,
    },
    {
      action: ResourceAction.Query,
      resource: ResourceSlug.Role,
      condition: null,
    },
    {
      action: ResourceAction.Update,
      resource: ResourceSlug.Role,
      condition: null,
    },
    {
      action: ResourceAction.Delete,
      resource: ResourceSlug.Role,
      condition: null,
    },
  ],

  [GroupKey.AccountProjectGroupOwner]: [
    {
      action: ResourceAction.Create,
      resource: ResourceSlug.Group,
      condition: null,
    },
    {
      action: ResourceAction.Read,
      resource: ResourceSlug.Group,
      condition: null,
    },
    {
      action: ResourceAction.Query,
      resource: ResourceSlug.Group,
      condition: null,
    },
    {
      action: ResourceAction.Update,
      resource: ResourceSlug.Group,
      condition: null,
    },
    {
      action: ResourceAction.Delete,
      resource: ResourceSlug.Group,
      condition: null,
    },
  ],

  [GroupKey.AccountProjectPermissionOwner]: [
    {
      action: ResourceAction.Create,
      resource: ResourceSlug.Permission,
      condition: null,
    },
    {
      action: ResourceAction.Read,
      resource: ResourceSlug.Permission,
      condition: null,
    },
    {
      action: ResourceAction.Query,
      resource: ResourceSlug.Permission,
      condition: null,
    },
    {
      action: ResourceAction.Update,
      resource: ResourceSlug.Permission,
      condition: null,
    },
    {
      action: ResourceAction.Delete,
      resource: ResourceSlug.Permission,
      condition: null,
    },
  ],

  [GroupKey.AccountProjectTagOwner]: [
    {
      action: ResourceAction.Create,
      resource: ResourceSlug.Tag,
      condition: null,
    },
    {
      action: ResourceAction.Query,
      resource: ResourceSlug.Tag,
      condition: null,
    },
    {
      action: ResourceAction.Update,
      resource: ResourceSlug.Tag,
      condition: {
        [ComparisonOperator.In]: {
          'resource.id': '{{resource.scope.tags}}',
        },
      },
    },
    {
      action: ResourceAction.Delete,
      resource: ResourceSlug.Tag,
      condition: {
        [ComparisonOperator.In]: {
          'resource.id': '{{resource.scope.tags}}',
        },
      },
    },
  ],
  [GroupKey.AccountProjectApiKeyOwner]: [
    {
      action: ResourceAction.Query,
      resource: ResourceSlug.ApiKey,
      condition: null,
    },
    {
      action: ResourceAction.Create,
      resource: ResourceSlug.ApiKey,
      condition: null,
    },
    {
      action: ResourceAction.Update,
      resource: ResourceSlug.ApiKey,
      condition: null,
    },
    {
      action: ResourceAction.Delete,
      resource: ResourceSlug.ApiKey,
      condition: null,
    },
    {
      action: ResourceAction.Revoke,
      resource: ResourceSlug.ApiKey,
      condition: null,
    },
  ],

  [GroupKey.AccountProjectAppOwner]: [
    {
      action: ResourceAction.Query,
      resource: ResourceSlug.ProjectApp,
      condition: null,
    },
    {
      action: ResourceAction.Create,
      resource: ResourceSlug.ProjectApp,
      condition: null,
    },
    {
      action: ResourceAction.Update,
      resource: ResourceSlug.ProjectApp,
      condition: null,
    },
    {
      action: ResourceAction.Delete,
      resource: ResourceSlug.ProjectApp,
      condition: null,
    },
  ],

  [GroupKey.AccountProjectSyncJobOwner]: [
    {
      action: ResourceAction.Query,
      resource: ResourceSlug.ProjectSyncJob,
      condition: null,
    },
    {
      action: ResourceAction.Update,
      resource: ResourceSlug.ProjectSyncJob,
      condition: null,
    },
  ],

  [GroupKey.ResourceCommon]: [
    {
      action: ResourceAction.Query,
      resource: ResourceSlug.Resource,
      condition: null,
    },
  ],

  [GroupKey.RoleCommon]: [
    {
      action: ResourceAction.Read,
      resource: ResourceSlug.Role,
      condition: null,
    },
    {
      action: ResourceAction.Query,
      resource: ResourceSlug.Role,
      condition: null,
    },
  ],

  [GroupKey.GroupCommon]: [
    {
      action: ResourceAction.Read,
      resource: ResourceSlug.Group,
      condition: null,
    },
    {
      action: ResourceAction.Query,
      resource: ResourceSlug.Group,
      condition: null,
    },
  ],

  [GroupKey.PermissionCommon]: [
    {
      action: ResourceAction.Read,
      resource: ResourceSlug.Permission,
      condition: null,
    },
    {
      action: ResourceAction.Query,
      resource: ResourceSlug.Permission,
      condition: null,
    },
  ],

  [GroupKey.TagCommon]: [
    {
      action: ResourceAction.Query,
      resource: ResourceSlug.Tag,
      condition: null,
    },
  ],

  [GroupKey.ApiKeyCommon]: [
    {
      action: ResourceAction.Query,
      resource: ResourceSlug.ApiKey,
      condition: null,
    },
    {
      action: ResourceAction.Exchange,
      resource: ResourceSlug.ApiKey,
      condition: null,
    },
  ],

  [GroupKey.OrganizationMemberCommon]: [
    {
      action: ResourceAction.Read,
      resource: ResourceSlug.OrganizationMember,
      condition: null,
    },
    {
      action: ResourceAction.Query,
      resource: ResourceSlug.OrganizationMember,
      condition: null,
    },
  ],

  [GroupKey.OrganizationInvitationCommon]: [
    {
      action: ResourceAction.Query,
      resource: ResourceSlug.OrganizationInvitation,
      condition: null,
    },
  ],

  [GroupKey.ProjectUserCommon]: [
    {
      action: ResourceAction.Read,
      resource: ResourceSlug.ProjectUser,
      condition: null,
    },
    {
      action: ResourceAction.Query,
      resource: ResourceSlug.ProjectUser,
      condition: null,
    },
  ],

  [GroupKey.UserSessionCommon]: [
    {
      action: ResourceAction.Read,
      resource: ResourceSlug.UserSession,
      condition: {
        [ComparisonOperator.StringEquals]: {
          'resource.userId': '{{user.id}}',
        },
      },
    },
    {
      action: ResourceAction.Query,
      resource: ResourceSlug.UserSession,
      condition: {
        [ComparisonOperator.StringEquals]: {
          'resource.userId': '{{user.id}}',
        },
      },
    },
  ],

  [GroupKey.UserAuthenticationMethodCommon]: [
    {
      action: ResourceAction.Read,
      resource: ResourceSlug.UserAuthenticationMethod,
      condition: {
        [ComparisonOperator.StringEquals]: {
          'resource.userId': '{{user.id}}',
        },
      },
    },
    {
      action: ResourceAction.Query,
      resource: ResourceSlug.UserAuthenticationMethod,
      condition: {
        [ComparisonOperator.StringEquals]: {
          'resource.userId': '{{user.id}}',
        },
      },
    },
  ],

  [GroupKey.UserOwner]: [
    {
      action: ResourceAction.Create,
      resource: ResourceSlug.User,
      condition: null,
    },
    {
      action: ResourceAction.Update,
      resource: ResourceSlug.User,
      condition: null,
    },
    {
      action: ResourceAction.Delete,
      resource: ResourceSlug.User,
      condition: null,
    },
    {
      action: ResourceAction.UploadPicture,
      resource: ResourceSlug.User,
      condition: null,
    },
  ],

  [GroupKey.UserAdmin]: [
    {
      action: ResourceAction.Create,
      resource: ResourceSlug.User,
      condition: null,
    },
    {
      action: ResourceAction.Update,
      resource: ResourceSlug.User,
      condition: null,
    },
    {
      action: ResourceAction.Delete,
      resource: ResourceSlug.User,
      condition: null,
    },

    {
      action: ResourceAction.UploadPicture,
      resource: ResourceSlug.User,
      condition: null,
    },
  ],

  [GroupKey.UserDev]: [
    {
      action: ResourceAction.Create,
      resource: ResourceSlug.User,
      condition: null,
    },
    {
      action: ResourceAction.Update,
      resource: ResourceSlug.User,
      condition: null,
    },
    {
      action: ResourceAction.Delete,
      resource: ResourceSlug.User,
      condition: null,
    },
    {
      action: ResourceAction.UploadPicture,
      resource: ResourceSlug.User,
      condition: null,
    },
  ],

  [GroupKey.OrganizationOwner]: [
    {
      action: ResourceAction.Update,
      resource: ResourceSlug.Organization,
      condition: null,
    },
    {
      action: ResourceAction.Delete,
      resource: ResourceSlug.Organization,
      condition: null,
    },
    {
      action: ResourceAction.UploadPicture,
      resource: ResourceSlug.Organization,
      condition: null,
    },
  ],

  [GroupKey.OrganizationAdmin]: [],

  [GroupKey.ProjectOwner]: [
    {
      action: ResourceAction.Create,
      resource: ResourceSlug.Project,
      condition: null,
    },
    {
      action: ResourceAction.Update,
      resource: ResourceSlug.Project,
      condition: {
        [ComparisonOperator.In]: {
          'resource.id': '{{resource.scope.projects}}',
        },
      },
    },
    {
      action: ResourceAction.Delete,
      resource: ResourceSlug.Project,
      condition: {
        [ComparisonOperator.In]: {
          'resource.id': '{{resource.scope.projects}}',
        },
      },
    },
    {
      action: ResourceAction.SetExportableApiKeySecrets,
      resource: ResourceSlug.Project,
      condition: {
        [ComparisonOperator.In]: {
          'resource.id': '{{resource.scope.projects}}',
        },
      },
    },
  ],

  [GroupKey.ProjectAdmin]: [
    {
      action: ResourceAction.Create,
      resource: ResourceSlug.Project,
      condition: null,
    },
    {
      action: ResourceAction.Update,
      resource: ResourceSlug.Project,
      condition: {
        [ComparisonOperator.In]: {
          'resource.id': '{{resource.scope.projects}}',
        },
      },
    },
    {
      action: ResourceAction.Delete,
      resource: ResourceSlug.Project,
      condition: {
        [ComparisonOperator.In]: {
          'resource.id': '{{resource.scope.projects}}',
        },
      },
    },
    {
      action: ResourceAction.SetExportableApiKeySecrets,
      resource: ResourceSlug.Project,
      condition: {
        [ComparisonOperator.In]: {
          'resource.id': '{{resource.scope.projects}}',
        },
      },
    },
  ],

  [GroupKey.ProjectDev]: [
    {
      action: ResourceAction.Create,
      resource: ResourceSlug.Project,
      condition: null,
    },
    {
      action: ResourceAction.Update,
      resource: ResourceSlug.Project,
      condition: {
        [ComparisonOperator.In]: {
          'resource.id': '{{resource.scope.projects}}',
        },
      },
    },
    {
      action: ResourceAction.Delete,
      resource: ResourceSlug.Project,
      condition: {
        [ComparisonOperator.In]: {
          'resource.id': '{{resource.scope.projects}}',
        },
      },
    },
  ],

  [GroupKey.ProjectAppOwner]: [
    {
      action: ResourceAction.Create,
      resource: ResourceSlug.ProjectApp,
      condition: null,
    },
    {
      action: ResourceAction.Update,
      resource: ResourceSlug.ProjectApp,
      condition: null,
    },
    {
      action: ResourceAction.Delete,
      resource: ResourceSlug.ProjectApp,
      condition: null,
    },
    {
      action: ResourceAction.Query,
      resource: ResourceSlug.ProjectApp,
      condition: null,
    },
  ],

  [GroupKey.ProjectAppAdmin]: [
    {
      action: ResourceAction.Create,
      resource: ResourceSlug.ProjectApp,
      condition: null,
    },
    {
      action: ResourceAction.Update,
      resource: ResourceSlug.ProjectApp,
      condition: null,
    },
    {
      action: ResourceAction.Delete,
      resource: ResourceSlug.ProjectApp,
      condition: null,
    },
    {
      action: ResourceAction.Query,
      resource: ResourceSlug.ProjectApp,
      condition: null,
    },
  ],

  [GroupKey.ProjectAppDev]: [
    {
      action: ResourceAction.Create,
      resource: ResourceSlug.ProjectApp,
      condition: null,
    },
    {
      action: ResourceAction.Update,
      resource: ResourceSlug.ProjectApp,
      condition: null,
    },
    {
      action: ResourceAction.Delete,
      resource: ResourceSlug.ProjectApp,
      condition: null,
    },
    {
      action: ResourceAction.Query,
      resource: ResourceSlug.ProjectApp,
      condition: null,
    },
  ],

  [GroupKey.ProjectSyncJobOwner]: [
    {
      action: ResourceAction.Query,
      resource: ResourceSlug.ProjectSyncJob,
      condition: null,
    },
    {
      action: ResourceAction.Update,
      resource: ResourceSlug.ProjectSyncJob,
      condition: null,
    },
  ],

  [GroupKey.ProjectSyncJobAdmin]: [
    {
      action: ResourceAction.Query,
      resource: ResourceSlug.ProjectSyncJob,
      condition: null,
    },
    {
      action: ResourceAction.Update,
      resource: ResourceSlug.ProjectSyncJob,
      condition: null,
    },
  ],

  [GroupKey.ProjectSyncJobDev]: [
    {
      action: ResourceAction.Query,
      resource: ResourceSlug.ProjectSyncJob,
      condition: null,
    },
    {
      action: ResourceAction.Update,
      resource: ResourceSlug.ProjectSyncJob,
      condition: null,
    },
  ],

  [GroupKey.ResourceOwner]: [
    {
      action: ResourceAction.Create,
      resource: ResourceSlug.Resource,
      condition: null,
    },
    {
      action: ResourceAction.Update,
      resource: ResourceSlug.Resource,
      condition: null,
    },
    {
      action: ResourceAction.Delete,
      resource: ResourceSlug.Resource,
      condition: null,
    },
  ],

  [GroupKey.ResourceAdmin]: [
    {
      action: ResourceAction.Create,
      resource: ResourceSlug.Resource,
      condition: null,
    },
    {
      action: ResourceAction.Update,
      resource: ResourceSlug.Resource,
      condition: null,
    },
    {
      action: ResourceAction.Delete,
      resource: ResourceSlug.Resource,
      condition: null,
    },
  ],

  [GroupKey.ResourceDev]: [
    {
      action: ResourceAction.Create,
      resource: ResourceSlug.Resource,
      condition: null,
    },
    {
      action: ResourceAction.Update,
      resource: ResourceSlug.Resource,
      condition: null,
    },
    {
      action: ResourceAction.Delete,
      resource: ResourceSlug.Resource,
      condition: null,
    },
  ],

  [GroupKey.RoleOwner]: [
    {
      action: ResourceAction.Create,
      resource: ResourceSlug.Role,
      condition: null,
    },
    {
      action: ResourceAction.Update,
      resource: ResourceSlug.Role,
      condition: null,
    },
    {
      action: ResourceAction.Delete,
      resource: ResourceSlug.Role,
      condition: null,
    },
  ],

  [GroupKey.RoleAdmin]: [
    {
      action: ResourceAction.Create,
      resource: ResourceSlug.Role,
      condition: null,
    },
    {
      action: ResourceAction.Update,
      resource: ResourceSlug.Role,
      condition: null,
    },
    {
      action: ResourceAction.Delete,
      resource: ResourceSlug.Role,
      condition: null,
    },
  ],

  [GroupKey.RoleDev]: [
    {
      action: ResourceAction.Create,
      resource: ResourceSlug.Role,
      condition: null,
    },
    {
      action: ResourceAction.Update,
      resource: ResourceSlug.Role,
      condition: null,
    },
    {
      action: ResourceAction.Delete,
      resource: ResourceSlug.Role,
      condition: null,
    },
  ],

  [GroupKey.GroupOwner]: [
    {
      action: ResourceAction.Create,
      resource: ResourceSlug.Group,
      condition: null,
    },
    {
      action: ResourceAction.Update,
      resource: ResourceSlug.Group,
      condition: null,
    },
    {
      action: ResourceAction.Delete,
      resource: ResourceSlug.Group,
      condition: null,
    },
  ],

  [GroupKey.GroupAdmin]: [
    {
      action: ResourceAction.Create,
      resource: ResourceSlug.Group,
      condition: null,
    },
    {
      action: ResourceAction.Update,
      resource: ResourceSlug.Group,
      condition: null,
    },
    {
      action: ResourceAction.Delete,
      resource: ResourceSlug.Group,
      condition: null,
    },
  ],

  [GroupKey.GroupDev]: [
    {
      action: ResourceAction.Create,
      resource: ResourceSlug.Group,
      condition: null,
    },
    {
      action: ResourceAction.Update,
      resource: ResourceSlug.Group,
      condition: null,
    },
    {
      action: ResourceAction.Delete,
      resource: ResourceSlug.Group,
      condition: null,
    },
  ],

  [GroupKey.PermissionOwner]: [
    {
      action: ResourceAction.Create,
      resource: ResourceSlug.Permission,
      condition: null,
    },
    {
      action: ResourceAction.Update,
      resource: ResourceSlug.Permission,
      condition: null,
    },
    {
      action: ResourceAction.Delete,
      resource: ResourceSlug.Permission,
      condition: null,
    },
  ],

  [GroupKey.PermissionAdmin]: [
    {
      action: ResourceAction.Create,
      resource: ResourceSlug.Permission,
      condition: null,
    },
    {
      action: ResourceAction.Update,
      resource: ResourceSlug.Permission,
      condition: null,
    },
    {
      action: ResourceAction.Delete,
      resource: ResourceSlug.Permission,
      condition: null,
    },
  ],

  [GroupKey.PermissionDev]: [
    {
      action: ResourceAction.Create,
      resource: ResourceSlug.Permission,
      condition: null,
    },
    {
      action: ResourceAction.Update,
      resource: ResourceSlug.Permission,
      condition: null,
    },
    {
      action: ResourceAction.Delete,
      resource: ResourceSlug.Permission,
      condition: null,
    },
  ],

  [GroupKey.TagOwner]: [
    {
      action: ResourceAction.Create,
      resource: ResourceSlug.Tag,
      condition: null,
    },
    {
      action: ResourceAction.Update,
      resource: ResourceSlug.Tag,
      condition: {
        [ComparisonOperator.In]: {
          'resource.id': '{{resource.scope.tags}}',
        },
      },
    },
    {
      action: ResourceAction.Delete,
      resource: ResourceSlug.Tag,
      condition: {
        [ComparisonOperator.In]: {
          'resource.id': '{{resource.scope.tags}}',
        },
      },
    },
  ],

  [GroupKey.TagAdmin]: [
    {
      action: ResourceAction.Create,
      resource: ResourceSlug.Tag,
      condition: null,
    },
    {
      action: ResourceAction.Update,
      resource: ResourceSlug.Tag,
      condition: {
        [ComparisonOperator.In]: {
          'resource.id': '{{resource.scope.tags}}',
        },
      },
    },
    {
      action: ResourceAction.Delete,
      resource: ResourceSlug.Tag,
      condition: {
        [ComparisonOperator.In]: {
          'resource.id': '{{resource.scope.tags}}',
        },
      },
    },
  ],

  [GroupKey.TagDev]: [
    {
      action: ResourceAction.Create,
      resource: ResourceSlug.Tag,
      condition: null,
    },
    {
      action: ResourceAction.Update,
      resource: ResourceSlug.Tag,
      condition: {
        [ComparisonOperator.In]: {
          'resource.id': '{{resource.scope.tags}}',
        },
      },
    },
    {
      action: ResourceAction.Delete,
      resource: ResourceSlug.Tag,
      condition: {
        [ComparisonOperator.In]: {
          'resource.id': '{{resource.scope.tags}}',
        },
      },
    },
  ],

  [GroupKey.ApiKeyOwner]: [
    {
      action: ResourceAction.Create,
      resource: ResourceSlug.ApiKey,
      condition: null,
    },
    {
      action: ResourceAction.Update,
      resource: ResourceSlug.ApiKey,
      condition: null,
    },
    {
      action: ResourceAction.Delete,
      resource: ResourceSlug.ApiKey,
      condition: null,
    },
    {
      action: ResourceAction.Revoke,
      resource: ResourceSlug.ApiKey,
      condition: null,
    },
  ],

  [GroupKey.ApiKeyAdmin]: [
    {
      action: ResourceAction.Create,
      resource: ResourceSlug.ApiKey,
      condition: null,
    },
    {
      action: ResourceAction.Update,
      resource: ResourceSlug.ApiKey,
      condition: null,
    },
    {
      action: ResourceAction.Delete,
      resource: ResourceSlug.ApiKey,
      condition: null,
    },
    {
      action: ResourceAction.Revoke,
      resource: ResourceSlug.ApiKey,
      condition: null,
    },
  ],

  [GroupKey.ApiKeyDev]: [
    {
      action: ResourceAction.Create,
      resource: ResourceSlug.ApiKey,
      condition: null,
    },
    {
      action: ResourceAction.Update,
      resource: ResourceSlug.ApiKey,
      condition: null,
    },
    {
      action: ResourceAction.Delete,
      resource: ResourceSlug.ApiKey,
      condition: null,
    },
    {
      action: ResourceAction.Revoke,
      resource: ResourceSlug.ApiKey,
      condition: null,
    },
  ],

  [GroupKey.OrganizationMemberOwner]: [
    {
      action: ResourceAction.Update,
      resource: ResourceSlug.OrganizationMember,
      condition: null,
    },
    {
      action: ResourceAction.Remove,
      resource: ResourceSlug.OrganizationMember,
      condition: null,
    },
  ],

  [GroupKey.OrganizationMemberAdmin]: [
    {
      action: ResourceAction.Update,
      resource: ResourceSlug.OrganizationMember,
      condition: null,
    },
    {
      action: ResourceAction.Remove,
      resource: ResourceSlug.OrganizationMember,
      condition: null,
    },
  ],

  [GroupKey.OrganizationInvitationOwner]: [
    {
      action: ResourceAction.Create,
      resource: ResourceSlug.OrganizationInvitation,
      condition: null,
    },
    {
      action: ResourceAction.Revoke,
      resource: ResourceSlug.OrganizationInvitation,
      condition: null,
    },
    {
      action: ResourceAction.ResendEmail,
      resource: ResourceSlug.OrganizationInvitation,
      condition: null,
    },
    {
      action: ResourceAction.Renew,
      resource: ResourceSlug.OrganizationInvitation,
      condition: null,
    },
  ],

  [GroupKey.OrganizationInvitationAdmin]: [
    {
      action: ResourceAction.Create,
      resource: ResourceSlug.OrganizationInvitation,
      condition: null,
    },
    {
      action: ResourceAction.Revoke,
      resource: ResourceSlug.OrganizationInvitation,
      condition: null,
    },
    {
      action: ResourceAction.ResendEmail,
      resource: ResourceSlug.OrganizationInvitation,
      condition: null,
    },
    {
      action: ResourceAction.Renew,
      resource: ResourceSlug.OrganizationInvitation,
      condition: null,
    },
  ],

  [GroupKey.ProjectUserOwner]: [
    {
      action: ResourceAction.SetEmail,
      resource: ResourceSlug.ProjectUser,
      condition: null,
    },
    {
      action: ResourceAction.SetPassword,
      resource: ResourceSlug.ProjectUser,
      condition: null,
    },
  ],

  [GroupKey.ProjectUserAdmin]: [
    {
      action: ResourceAction.SetEmail,
      resource: ResourceSlug.ProjectUser,
      condition: null,
    },
    {
      action: ResourceAction.SetPassword,
      resource: ResourceSlug.ProjectUser,
      condition: null,
    },
  ],
};

/**
 * Permissions that exist as database rows but belong to no standard group, so an
 * organization grants them deliberately (e.g. through the groups UI/API).
 *
 * The seed creates `permissions` rows only from `PERMISSION_MAPPING_TEMPLATES`
 * (every template also links its permission to its group). An action listed here is
 * seeded as a row with no `group_permissions` link. Do not list an action both here
 * and in a template: a template for the same resource:action would reuse the row.
 */
export type StandalonePermission = PermissionMappingTemplate & {
  /**
   * Machine-only permission: a project API key may carry it when its creator holds the gate
   * permission named here in the key's project scope, even if the creator does not hold the
   * permission itself. It describes who may attach the permission to a key and nothing else.
   */
  attachableByHoldersOf?: { resource: ResourceSlugType; action: ResourceAction };
};

export const STANDALONE_PERMISSIONS: readonly StandalonePermission[] = [
  {
    // Reads project users' credential hashes: no default holder.
    action: ResourceAction.ExportCredentials,
    resource: ResourceSlug.ProjectUser,
    condition: null,
    attachableByHoldersOf: {
      resource: ResourceSlug.ProjectUser,
      action: ResourceAction.SetPassword,
    },
  },
];

export const MACHINE_ONLY_PERMISSIONS: readonly StandalonePermission[] =
  STANDALONE_PERMISSIONS.filter((permission) => permission.attachableByHoldersOf !== undefined);

/** The gate permission of a machine-only permission, or undefined when it is not machine-only. */
export function machineOnlyGate(
  resource: string,
  action: string
): { resource: ResourceSlugType; action: ResourceAction } | undefined {
  const normalizedResource = resource.trim().toLowerCase();
  const normalizedAction = action.trim().toLowerCase();
  return MACHINE_ONLY_PERMISSIONS.find(
    (permission) =>
      permission.resource.toLowerCase() === normalizedResource &&
      permission.action.toLowerCase() === normalizedAction
  )?.attachableByHoldersOf;
}

export const PERMISSION_MAPPINGS: Record<string, PermissionMapping[]> = Object.keys(
  GroupKey
).reduce(
  (acc, groupKeyProp) => {
    const groupKeyValue = GroupKey[groupKeyProp as keyof typeof GroupKey];
    const templates = PERMISSION_MAPPING_TEMPLATES[groupKeyValue];
    if (!templates) {
      return acc;
    }
    return {
      ...acc,
      [groupKeyValue]: templates.map((template) => ({
        ...template,
        groupName: groupKeyValue,
      })),
    };
  },
  {} as Record<string, PermissionMapping[]>
);
