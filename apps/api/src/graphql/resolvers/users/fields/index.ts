import { userApiKeyCredentialsResolver as apiKeyCredentials } from './api-key-credentials.resolver';
import {
  userGroupsListResolver as groups,
  userGroupsResolver as userGroups,
} from './groups.resolver';
import { userPasswordCredentialResolver as passwordCredential } from './password-credential.resolver';
import {
  userPermissionsListResolver as permissions,
  userPermissionsResolver as userPermissions,
} from './permissions.resolver';
import {
  userGroupCountResolver as groupCount,
  userPermissionCountResolver as permissionCount,
  userPrimaryTagResolver as primaryTag,
  userProjectUserApiKeyCountResolver as projectUserApiKeyCount,
  userRoleCountResolver as roleCount,
  userTagCountResolver as tagCount,
} from './primary-tag.resolver';
import { userRolesResolver as roles } from './roles.resolver';
import { userTagsResolver as tags } from './tags.resolver';

export const userResolver = {
  tags,
  roles,
  userGroups,
  userPermissions,
  groups,
  permissions,
  primaryTag,
  roleCount,
  groupCount,
  permissionCount,
  projectUserApiKeyCount,
  tagCount,
  passwordCredential,
  apiKeyCredentials,
};
