import { getDescriptionKey, getNameKey, I18nPrefix } from './i18n-helpers';
import { ResourceAction, ResourceSlug } from './resources';
import { ORGANIZATION_ROLES, ROLE_KEYS, RoleKey } from './roles';

export interface GroupDefinition {
  name: string;
  description?: string;
  resource: ResourceSlug;
  permissions: readonly ResourceAction[];
  assignedRoles: readonly RoleKey[];
}

export const GroupKey = {
  AccountCommon: 'AccountCommon',
  UserCommon: 'UserCommon',
  OrganizationCommon: 'OrganizationCommon',
  ProjectCommon: 'ProjectCommon',
  AccountProjectOwner: 'AccountProjectOwner',
  AccountProjectUserOwner: 'AccountProjectUserOwner',
  AccountProjectResourceOwner: 'AccountProjectResourceOwner',
  AccountProjectRoleOwner: 'AccountProjectRoleOwner',
  AccountProjectGroupOwner: 'AccountProjectGroupOwner',
  AccountProjectPermissionOwner: 'AccountProjectPermissionOwner',
  AccountProjectTagOwner: 'AccountProjectTagOwner',
  AccountProjectApiKeyOwner: 'AccountProjectApiKeyOwner',
  ResourceCommon: 'ResourceCommon',
  RoleCommon: 'RoleCommon',
  GroupCommon: 'GroupCommon',
  PermissionCommon: 'PermissionCommon',
  TagCommon: 'TagCommon',
  ApiKeyCommon: 'APIKeyCommon',
  OrganizationMemberCommon: 'OrganizationMemberCommon',
  OrganizationInvitationOrganizationAccountOwner: 'OrganizationInvitationOrganizationAccountOwner',
  OrganizationInvitationCommon: 'OrganizationInvitationCommon',
  ProjectUserCommon: 'ProjectUserCommon',
  UserSessionCommon: 'UserSessionCommon',
  UserAuthenticationMethodCommon: 'UserAuthenticationMethodCommon',
  PersonalAccountOwner: 'PersonalAccountOwner',
  OrganizationAccountOwner: 'OrganizationAccountOwner',
  OrganizationOwner: 'OrganizationOwner',
  OrganizationAdmin: 'OrganizationAdmin',
  OrganizationDev: 'OrganizationDev',
  OrganizationViewer: 'OrganizationViewer',
  UserOwner: 'UserOwner',
  UserAdmin: 'UserAdmin',
  UserDev: 'UserDev',
  UserViewer: 'UserViewer',
  ProjectOwner: 'ProjectOwner',
  ProjectAdmin: 'ProjectAdmin',
  ProjectDev: 'ProjectDev',
  ProjectViewer: 'ProjectViewer',
  ResourceOwner: 'ResourceOwner',
  ResourceAdmin: 'ResourceAdmin',
  ResourceDev: 'ResourceDev',
  ResourceViewer: 'ResourceViewer',
  RoleOwner: 'RoleOwner',
  RoleAdmin: 'RoleAdmin',
  RoleDev: 'RoleDev',
  RoleViewer: 'RoleViewer',
  GroupOwner: 'GroupOwner',
  GroupAdmin: 'GroupAdmin',
  GroupDev: 'GroupDev',
  GroupViewer: 'GroupViewer',
  PermissionOwner: 'PermissionOwner',
  PermissionAdmin: 'PermissionAdmin',
  PermissionDev: 'PermissionDev',
  PermissionViewer: 'PermissionViewer',
  TagOwner: 'TagOwner',
  TagAdmin: 'TagAdmin',
  TagDev: 'TagDev',
  TagViewer: 'TagViewer',
  ApiKeyOwner: 'APIKeyOwner',
  ApiKeyAdmin: 'APIKeyAdmin',
  ApiKeyDev: 'APIKeyDev',
  ApiKeyViewer: 'APIKeyViewer',
  OrganizationMemberOwner: 'OrganizationMemberOwner',
  OrganizationMemberAdmin: 'OrganizationMemberAdmin',
  OrganizationMemberDev: 'OrganizationMemberDev',
  OrganizationMemberViewer: 'OrganizationMemberViewer',
  OrganizationInvitationOwner: 'OrganizationInvitationOwner',
  OrganizationInvitationAdmin: 'OrganizationInvitationAdmin',
  OrganizationInvitationDev: 'OrganizationInvitationDev',
  OrganizationInvitationViewer: 'OrganizationInvitationViewer',
  ProjectUserOwner: 'ProjectUserOwner',
  ProjectUserAdmin: 'ProjectUserAdmin',
  ProjectUserDev: 'ProjectUserDev',
  ProjectUserViewer: 'ProjectUserViewer',
  UserSessionOwner: 'UserSessionOwner',
  UserSessionAdmin: 'UserSessionAdmin',
  UserSessionDev: 'UserSessionDev',
  UserSessionViewer: 'UserSessionViewer',
  UserAuthenticationMethodOwner: 'UserAuthenticationMethodOwner',
  UserAuthenticationMethodAdmin: 'UserAuthenticationMethodAdmin',
  UserAuthenticationMethodDev: 'UserAuthenticationMethodDev',
  UserAuthenticationMethodViewer: 'UserAuthenticationMethodViewer',
};

export type GroupKey = (typeof GroupKey)[keyof typeof GroupKey];

type GroupTemplate = Omit<GroupDefinition, 'name' | 'description'>;

const GROUPS: Record<GroupKey, GroupTemplate> = {
  [GroupKey.AccountCommon]: {
    resource: ResourceSlug.Account,
    permissions: [ResourceAction.Read, ResourceAction.Query],
    assignedRoles: [RoleKey.PersonalAccountOwner, RoleKey.OrganizationAccountOwner],
  },
  [GroupKey.UserCommon]: {
    resource: ResourceSlug.User,
    permissions: [ResourceAction.Read, ResourceAction.Query],
    assignedRoles: ORGANIZATION_ROLES,
  },
  [GroupKey.OrganizationCommon]: {
    resource: ResourceSlug.Organization,
    permissions: [ResourceAction.Read, ResourceAction.Query],
    assignedRoles: [RoleKey.PersonalAccountOwner, RoleKey.OrganizationAccountOwner],
  },
  [GroupKey.ProjectCommon]: {
    resource: ResourceSlug.Project,
    permissions: [ResourceAction.Query],
    assignedRoles: ROLE_KEYS,
  },
  [GroupKey.AccountProjectOwner]: {
    resource: ResourceSlug.Project,
    permissions: [ResourceAction.Create, ResourceAction.Update, ResourceAction.Delete],
    assignedRoles: [RoleKey.PersonalAccountOwner, RoleKey.OrganizationAccountOwner],
  },
  [GroupKey.AccountProjectUserOwner]: {
    resource: ResourceSlug.User,
    permissions: [
      ResourceAction.Create,
      ResourceAction.Read,
      ResourceAction.Update,
      ResourceAction.Delete,
      ResourceAction.Query,
      ResourceAction.UploadPicture,
    ],
    assignedRoles: [RoleKey.PersonalAccountOwner, RoleKey.OrganizationAccountOwner],
  },
  [GroupKey.AccountProjectResourceOwner]: {
    resource: ResourceSlug.Resource,
    permissions: [
      ResourceAction.Create,
      ResourceAction.Update,
      ResourceAction.Delete,
      ResourceAction.Query,
    ],
    assignedRoles: [RoleKey.PersonalAccountOwner, RoleKey.OrganizationAccountOwner],
  },
  [GroupKey.AccountProjectRoleOwner]: {
    resource: ResourceSlug.Role,
    permissions: [
      ResourceAction.Create,
      ResourceAction.Update,
      ResourceAction.Delete,
      ResourceAction.Query,
    ],
    assignedRoles: [RoleKey.PersonalAccountOwner, RoleKey.OrganizationAccountOwner],
  },
  [GroupKey.AccountProjectGroupOwner]: {
    resource: ResourceSlug.Group,
    permissions: [
      ResourceAction.Create,
      ResourceAction.Update,
      ResourceAction.Delete,
      ResourceAction.Query,
    ],
    assignedRoles: [RoleKey.PersonalAccountOwner, RoleKey.OrganizationAccountOwner],
  },
  [GroupKey.AccountProjectPermissionOwner]: {
    resource: ResourceSlug.Permission,
    permissions: [
      ResourceAction.Create,
      ResourceAction.Update,
      ResourceAction.Delete,
      ResourceAction.Query,
    ],
    assignedRoles: [RoleKey.PersonalAccountOwner, RoleKey.OrganizationAccountOwner],
  },
  [GroupKey.AccountProjectTagOwner]: {
    resource: ResourceSlug.Tag,
    permissions: [
      ResourceAction.Create,
      ResourceAction.Update,
      ResourceAction.Delete,
      ResourceAction.Query,
    ],
    assignedRoles: [RoleKey.PersonalAccountOwner, RoleKey.OrganizationAccountOwner],
  },
  [GroupKey.AccountProjectApiKeyOwner]: {
    resource: ResourceSlug.ApiKey,
    permissions: [
      ResourceAction.Create,
      ResourceAction.Update,
      ResourceAction.Delete,
      ResourceAction.Query,
    ],
    assignedRoles: [RoleKey.PersonalAccountOwner, RoleKey.OrganizationAccountOwner],
  },
  [GroupKey.ResourceCommon]: {
    resource: ResourceSlug.Resource,
    permissions: [ResourceAction.Query],
    assignedRoles: ORGANIZATION_ROLES,
  },
  [GroupKey.RoleCommon]: {
    resource: ResourceSlug.Role,
    permissions: [ResourceAction.Query],
    assignedRoles: ORGANIZATION_ROLES,
  },
  [GroupKey.GroupCommon]: {
    resource: ResourceSlug.Group,
    permissions: [ResourceAction.Query],
    assignedRoles: ORGANIZATION_ROLES,
  },
  [GroupKey.PermissionCommon]: {
    resource: ResourceSlug.Permission,
    permissions: [ResourceAction.Query],
    assignedRoles: ORGANIZATION_ROLES,
  },
  [GroupKey.TagCommon]: {
    resource: ResourceSlug.Tag,
    permissions: [ResourceAction.Query],
    assignedRoles: ROLE_KEYS,
  },
  [GroupKey.ApiKeyCommon]: {
    resource: ResourceSlug.ApiKey,
    permissions: [ResourceAction.Query, ResourceAction.Exchange],
    assignedRoles: ORGANIZATION_ROLES,
  },
  [GroupKey.OrganizationMemberCommon]: {
    resource: ResourceSlug.OrganizationMember,
    permissions: [ResourceAction.Read, ResourceAction.Query],
    assignedRoles: ORGANIZATION_ROLES,
  },
  [GroupKey.OrganizationInvitationOrganizationAccountOwner]: {
    resource: ResourceSlug.OrganizationInvitation,
    permissions: [ResourceAction.Accept],
    assignedRoles: [RoleKey.OrganizationAccountOwner],
  },
  [GroupKey.OrganizationInvitationCommon]: {
    resource: ResourceSlug.OrganizationInvitation,
    permissions: [ResourceAction.Query],
    assignedRoles: ORGANIZATION_ROLES,
  },
  [GroupKey.ProjectUserCommon]: {
    resource: ResourceSlug.ProjectUser,
    permissions: [ResourceAction.Read, ResourceAction.Query],
    assignedRoles: ORGANIZATION_ROLES,
  },
  [GroupKey.UserSessionCommon]: {
    resource: ResourceSlug.UserSession,
    permissions: [ResourceAction.Read, ResourceAction.Query],
    assignedRoles: ROLE_KEYS,
  },
  [GroupKey.UserAuthenticationMethodCommon]: {
    resource: ResourceSlug.UserAuthenticationMethod,
    permissions: [ResourceAction.Read, ResourceAction.Query],
    assignedRoles: ROLE_KEYS,
  },

  [GroupKey.PersonalAccountOwner]: {
    resource: ResourceSlug.Account,
    permissions: [ResourceAction.Delete],
    assignedRoles: [RoleKey.PersonalAccountOwner],
  },
  [GroupKey.OrganizationAccountOwner]: {
    resource: ResourceSlug.Account,
    permissions: [ResourceAction.Delete],
    assignedRoles: [RoleKey.OrganizationAccountOwner],
  },

  [GroupKey.UserOwner]: {
    resource: ResourceSlug.User,
    permissions: [
      ResourceAction.Create,
      ResourceAction.Update,
      ResourceAction.Delete,
      ResourceAction.ExportData,
    ],
    assignedRoles: [RoleKey.OrganizationOwner],
  },
  [GroupKey.UserAdmin]: {
    resource: ResourceSlug.User,
    permissions: [
      ResourceAction.Create,
      ResourceAction.Update,
      ResourceAction.Delete,
      ResourceAction.ExportData,
    ],
    assignedRoles: [RoleKey.OrganizationAdmin],
  },
  [GroupKey.UserDev]: {
    resource: ResourceSlug.User,
    permissions: [
      ResourceAction.Create,
      ResourceAction.Update,
      ResourceAction.Delete,
      ResourceAction.UploadPicture,
    ],
    assignedRoles: [RoleKey.OrganizationDev],
  },
  [GroupKey.UserViewer]: {
    resource: ResourceSlug.User,
    permissions: [],
    assignedRoles: [],
  },

  [GroupKey.OrganizationOwner]: {
    resource: ResourceSlug.Organization,
    permissions: [ResourceAction.Create, ResourceAction.Update, ResourceAction.Delete],
    assignedRoles: [RoleKey.OrganizationOwner],
  },
  [GroupKey.OrganizationAdmin]: {
    resource: ResourceSlug.Organization,
    permissions: [],
    assignedRoles: [RoleKey.OrganizationAdmin],
  },
  [GroupKey.OrganizationDev]: {
    resource: ResourceSlug.Organization,
    permissions: [],
    assignedRoles: [],
  },
  [GroupKey.OrganizationViewer]: {
    resource: ResourceSlug.Organization,
    permissions: [],
    assignedRoles: [],
  },

  [GroupKey.ProjectOwner]: {
    resource: ResourceSlug.Project,
    permissions: [ResourceAction.Create, ResourceAction.Update, ResourceAction.Delete],
    assignedRoles: [RoleKey.OrganizationOwner],
  },
  [GroupKey.ProjectAdmin]: {
    resource: ResourceSlug.Project,
    permissions: [ResourceAction.Create, ResourceAction.Update, ResourceAction.Delete],
    assignedRoles: [RoleKey.OrganizationAdmin],
  },
  [GroupKey.ProjectDev]: {
    resource: ResourceSlug.Project,
    permissions: [ResourceAction.Create, ResourceAction.Update, ResourceAction.Delete],
    assignedRoles: [RoleKey.OrganizationDev],
  },
  [GroupKey.ProjectViewer]: {
    resource: ResourceSlug.Project,
    permissions: [],
    assignedRoles: [],
  },

  [GroupKey.ResourceOwner]: {
    resource: ResourceSlug.Resource,
    permissions: [ResourceAction.Create, ResourceAction.Update, ResourceAction.Delete],
    assignedRoles: [RoleKey.OrganizationOwner],
  },
  [GroupKey.ResourceAdmin]: {
    resource: ResourceSlug.Resource,
    permissions: [ResourceAction.Create, ResourceAction.Update, ResourceAction.Delete],
    assignedRoles: [RoleKey.OrganizationAdmin],
  },
  [GroupKey.ResourceDev]: {
    resource: ResourceSlug.Resource,
    permissions: [ResourceAction.Create, ResourceAction.Update, ResourceAction.Delete],
    assignedRoles: [RoleKey.OrganizationDev],
  },
  [GroupKey.ResourceViewer]: {
    resource: ResourceSlug.Resource,
    permissions: [],
    assignedRoles: [],
  },

  [GroupKey.RoleOwner]: {
    resource: ResourceSlug.Role,
    permissions: [ResourceAction.Create, ResourceAction.Update, ResourceAction.Delete],
    assignedRoles: [RoleKey.OrganizationOwner],
  },
  [GroupKey.RoleAdmin]: {
    resource: ResourceSlug.Role,
    permissions: [ResourceAction.Create, ResourceAction.Update, ResourceAction.Delete],
    assignedRoles: [RoleKey.OrganizationAdmin],
  },
  [GroupKey.RoleDev]: {
    resource: ResourceSlug.Role,
    permissions: [ResourceAction.Create, ResourceAction.Update, ResourceAction.Delete],
    assignedRoles: [RoleKey.OrganizationDev],
  },
  [GroupKey.RoleViewer]: {
    resource: ResourceSlug.Role,
    permissions: [],
    assignedRoles: [],
  },

  [GroupKey.GroupOwner]: {
    resource: ResourceSlug.Group,
    permissions: [ResourceAction.Create, ResourceAction.Update, ResourceAction.Delete],
    assignedRoles: [RoleKey.OrganizationOwner],
  },
  [GroupKey.GroupAdmin]: {
    resource: ResourceSlug.Group,
    permissions: [ResourceAction.Create, ResourceAction.Update, ResourceAction.Delete],
    assignedRoles: [RoleKey.OrganizationAdmin],
  },
  [GroupKey.GroupDev]: {
    resource: ResourceSlug.Group,
    permissions: [ResourceAction.Create, ResourceAction.Update, ResourceAction.Delete],
    assignedRoles: [RoleKey.OrganizationDev],
  },
  [GroupKey.GroupViewer]: {
    resource: ResourceSlug.Group,
    permissions: [],
    assignedRoles: [],
  },

  [GroupKey.PermissionOwner]: {
    resource: ResourceSlug.Permission,
    permissions: [ResourceAction.Create, ResourceAction.Update, ResourceAction.Delete],
    assignedRoles: [RoleKey.OrganizationOwner],
  },
  [GroupKey.PermissionAdmin]: {
    resource: ResourceSlug.Permission,
    permissions: [ResourceAction.Create, ResourceAction.Update, ResourceAction.Delete],
    assignedRoles: [RoleKey.OrganizationAdmin],
  },
  [GroupKey.PermissionDev]: {
    resource: ResourceSlug.Permission,
    permissions: [ResourceAction.Create, ResourceAction.Update, ResourceAction.Delete],
    assignedRoles: [RoleKey.OrganizationDev],
  },
  [GroupKey.PermissionViewer]: {
    resource: ResourceSlug.Permission,
    permissions: [],
    assignedRoles: [],
  },

  [GroupKey.TagOwner]: {
    resource: ResourceSlug.Tag,
    permissions: [ResourceAction.Create, ResourceAction.Update, ResourceAction.Delete],
    assignedRoles: [RoleKey.OrganizationOwner],
  },
  [GroupKey.TagAdmin]: {
    resource: ResourceSlug.Tag,
    permissions: [ResourceAction.Create, ResourceAction.Update, ResourceAction.Delete],
    assignedRoles: [RoleKey.OrganizationAdmin],
  },
  [GroupKey.TagDev]: {
    resource: ResourceSlug.Tag,
    permissions: [ResourceAction.Create, ResourceAction.Update, ResourceAction.Delete],
    assignedRoles: [RoleKey.OrganizationDev],
  },
  [GroupKey.TagViewer]: {
    resource: ResourceSlug.Tag,
    permissions: [],
    assignedRoles: [],
  },

  [GroupKey.ApiKeyOwner]: {
    resource: ResourceSlug.ApiKey,
    permissions: [ResourceAction.Create, ResourceAction.Delete, ResourceAction.Revoke],
    assignedRoles: [RoleKey.OrganizationOwner],
  },
  [GroupKey.ApiKeyAdmin]: {
    resource: ResourceSlug.ApiKey,
    permissions: [ResourceAction.Create, ResourceAction.Delete, ResourceAction.Revoke],
    assignedRoles: [RoleKey.OrganizationAdmin],
  },
  [GroupKey.ApiKeyDev]: {
    resource: ResourceSlug.ApiKey,
    permissions: [ResourceAction.Create, ResourceAction.Delete, ResourceAction.Revoke],
    assignedRoles: [RoleKey.OrganizationDev],
  },
  [GroupKey.ApiKeyViewer]: {
    resource: ResourceSlug.ApiKey,
    permissions: [],
    assignedRoles: [],
  },

  [GroupKey.OrganizationMemberOwner]: {
    resource: ResourceSlug.OrganizationMember,
    permissions: [ResourceAction.Update, ResourceAction.Remove],
    assignedRoles: [RoleKey.OrganizationOwner],
  },
  [GroupKey.OrganizationMemberAdmin]: {
    resource: ResourceSlug.OrganizationMember,
    permissions: [ResourceAction.Update, ResourceAction.Remove],
    assignedRoles: [RoleKey.OrganizationAdmin],
  },
  [GroupKey.OrganizationMemberDev]: {
    resource: ResourceSlug.OrganizationMember,
    permissions: [],
    assignedRoles: [],
  },
  [GroupKey.OrganizationMemberViewer]: {
    resource: ResourceSlug.OrganizationMember,
    permissions: [],
    assignedRoles: [],
  },

  [GroupKey.OrganizationInvitationOwner]: {
    resource: ResourceSlug.OrganizationInvitation,
    permissions: [ResourceAction.Create, ResourceAction.Revoke, ResourceAction.ResendEmail],
    assignedRoles: [RoleKey.OrganizationOwner],
  },
  [GroupKey.OrganizationInvitationAdmin]: {
    resource: ResourceSlug.OrganizationInvitation,
    permissions: [ResourceAction.Create, ResourceAction.Revoke, ResourceAction.ResendEmail],
    assignedRoles: [RoleKey.OrganizationAdmin],
  },
  [GroupKey.OrganizationInvitationDev]: {
    resource: ResourceSlug.OrganizationInvitation,
    permissions: [],
    assignedRoles: [],
  },
  [GroupKey.OrganizationInvitationViewer]: {
    resource: ResourceSlug.OrganizationInvitation,
    permissions: [],
    assignedRoles: [],
  },

  [GroupKey.ProjectUserOwner]: {
    resource: ResourceSlug.ProjectUser,
    permissions: [],
    assignedRoles: [],
  },
  [GroupKey.ProjectUserAdmin]: {
    resource: ResourceSlug.ProjectUser,
    permissions: [],
    assignedRoles: [],
  },
  [GroupKey.ProjectUserDev]: {
    resource: ResourceSlug.ProjectUser,
    permissions: [],
    assignedRoles: [],
  },
  [GroupKey.ProjectUserViewer]: {
    resource: ResourceSlug.ProjectUser,
    permissions: [],
    assignedRoles: [],
  },
  [GroupKey.UserSessionOwner]: {
    resource: ResourceSlug.UserSession,
    permissions: [],
    assignedRoles: [],
  },
  [GroupKey.UserSessionAdmin]: {
    resource: ResourceSlug.UserSession,
    permissions: [],
    assignedRoles: [],
  },
  [GroupKey.UserSessionDev]: {
    resource: ResourceSlug.UserSession,
    permissions: [],
    assignedRoles: [],
  },
  [GroupKey.UserSessionViewer]: {
    resource: ResourceSlug.UserSession,
    permissions: [],
    assignedRoles: [],
  },
  [GroupKey.UserAuthenticationMethodOwner]: {
    resource: ResourceSlug.UserAuthenticationMethod,
    permissions: [],
    assignedRoles: [],
  },
  [GroupKey.UserAuthenticationMethodAdmin]: {
    resource: ResourceSlug.UserAuthenticationMethod,
    permissions: [],
    assignedRoles: [],
  },
  [GroupKey.UserAuthenticationMethodDev]: {
    resource: ResourceSlug.UserAuthenticationMethod,
    permissions: [],
    assignedRoles: [],
  },
  [GroupKey.UserAuthenticationMethodViewer]: {
    resource: ResourceSlug.UserAuthenticationMethod,
    permissions: [],
    assignedRoles: [],
  },
};

export const GROUP_DEFINITIONS: Record<GroupKey, GroupDefinition> = Object.keys(GroupKey).reduce(
  (acc, groupKeyProp) => {
    const groupKeyValue = GroupKey[groupKeyProp as keyof typeof GroupKey];
    const template = GROUPS[groupKeyValue];
    if (!template) {
      throw new Error(`Group template not found for key: ${groupKeyProp}`);
    }
    return {
      ...acc,
      [groupKeyValue]: {
        name: getNameKey(GroupKey, groupKeyValue, I18nPrefix.Groups),
        description: getDescriptionKey(GroupKey, groupKeyValue, I18nPrefix.Groups),
        ...template,
      },
    };
  },
  {} as Record<GroupKey, GroupDefinition>
);
