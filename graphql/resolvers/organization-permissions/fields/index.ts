import { organizationPermissionOrganizationResolver } from './organization';
import { organizationPermissionPermissionResolver } from './permission';

export const OrganizationPermission = {
  organization: organizationPermissionOrganizationResolver,
  permission: organizationPermissionPermissionResolver,
};
