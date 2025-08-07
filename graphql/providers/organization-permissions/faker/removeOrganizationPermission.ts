import { deleteOrganizationPermissionByOrganizationAndPermission } from '@/graphql/providers/organization-permissions/faker/dataStore';

import { RemoveOrganizationPermissionParams, RemoveOrganizationPermissionResult } from '../types';

export async function removeOrganizationPermission({
  input,
}: RemoveOrganizationPermissionParams): Promise<RemoveOrganizationPermissionResult> {
  const deletedOrganizationPermission = deleteOrganizationPermissionByOrganizationAndPermission(
    input.organizationId,
    input.permissionId
  );
  return deletedOrganizationPermission !== null;
}
