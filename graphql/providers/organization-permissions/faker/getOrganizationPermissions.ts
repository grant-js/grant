import { getOrganizationPermissionsByOrganizationId } from '@/graphql/providers/organization-permissions/faker/dataStore';
import {
  GetOrganizationPermissionsParams,
  GetOrganizationPermissionsResult,
} from '@/graphql/providers/organization-permissions/types';

export async function getOrganizationPermissions({
  organizationId,
}: GetOrganizationPermissionsParams): Promise<GetOrganizationPermissionsResult> {
  return getOrganizationPermissionsByOrganizationId(organizationId);
}
