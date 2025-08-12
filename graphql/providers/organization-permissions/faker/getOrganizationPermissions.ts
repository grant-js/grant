import {
  OrganizationPermission,
  QueryOrganizationPermissionsArgs,
} from '@/graphql/generated/types';
import { getOrganizationPermissionsByOrganizationId } from '@/graphql/providers/organization-permissions/faker/dataStore';
export async function getOrganizationPermissions({
  organizationId,
}: QueryOrganizationPermissionsArgs): Promise<OrganizationPermission[]> {
  return getOrganizationPermissionsByOrganizationId(organizationId);
}
