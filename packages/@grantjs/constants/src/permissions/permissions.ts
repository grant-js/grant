import { ComparisonOperator, type ConditionExpression } from '@grantjs/core';

import { ResourceAction, ResourceSlug, type ResourceSlug as ResourceSlugType } from './resources';

import { GroupKey } from '.';

export interface PermissionMapping {
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
      condition: null,
    },
    {
      action: ResourceAction.Delete,
      resource: ResourceSlug.Tag,
      condition: null,
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
      action: ResourceAction.Query,
      resource: ResourceSlug.Role,
      condition: null,
    },
  ],

  [GroupKey.GroupCommon]: [
    {
      action: ResourceAction.Query,
      resource: ResourceSlug.Group,
      condition: null,
    },
  ],

  [GroupKey.PermissionCommon]: [
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

  [GroupKey.OrganizationInvitationOrganizationAccountOwner]: [
    {
      action: ResourceAction.Accept,
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
      condition: null,
    },
    {
      action: ResourceAction.Delete,
      resource: ResourceSlug.Project,
      condition: null,
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
      condition: null,
    },
    {
      action: ResourceAction.Delete,
      resource: ResourceSlug.Project,
      condition: null,
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
      condition: null,
    },
    {
      action: ResourceAction.Delete,
      resource: ResourceSlug.Project,
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
      condition: null,
    },
    {
      action: ResourceAction.Delete,
      resource: ResourceSlug.Tag,
      condition: null,
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
      condition: null,
    },
    {
      action: ResourceAction.Delete,
      resource: ResourceSlug.Tag,
      condition: null,
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
      condition: null,
    },
    {
      action: ResourceAction.Delete,
      resource: ResourceSlug.Tag,
      condition: null,
    },
  ],

  [GroupKey.ApiKeyOwner]: [
    {
      action: ResourceAction.Create,
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
      action: ResourceAction.Delete,
      resource: ResourceSlug.ApiKey,
      condition: {
        [ComparisonOperator.StringEquals]: {
          'resource.createdBy': '{{user.id}}',
        },
      },
    },
    {
      action: ResourceAction.Revoke,
      resource: ResourceSlug.ApiKey,
      condition: {
        [ComparisonOperator.StringEquals]: {
          'resource.createdBy': '{{user.id}}',
        },
      },
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
};

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
