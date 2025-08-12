import { addOrganizationPermission } from '@/graphql/providers/organization-permissions/faker/addOrganizationPermission';
import { getOrganizationPermissions } from '@/graphql/providers/organization-permissions/faker/getOrganizationPermissions';
import { removeOrganizationPermission } from '@/graphql/providers/organization-permissions/faker/removeOrganizationPermission';
import { OrganizationPermissionDataProvider } from '@/graphql/providers/organization-permissions/types';
export const organizationPermissionFakerProvider: OrganizationPermissionDataProvider = {
  getOrganizationPermissions,
  addOrganizationPermission,
  removeOrganizationPermission,
};
