import { OrganizationPermission } from '@/graphql/generated/types';
import { addOrganizationPermission as addOrganizationPermissionInStore } from '@/graphql/providers/organization-permissions/faker/dataStore';

import { AddOrganizationPermissionParams, AddOrganizationPermissionResult } from '../types';

export async function addOrganizationPermission({
  input,
}: AddOrganizationPermissionParams): Promise<AddOrganizationPermissionResult> {
  const organizationPermissionData = addOrganizationPermissionInStore(
    input.organizationId,
    input.permissionId
  );
  return organizationPermissionData as OrganizationPermission; // Convert OrganizationPermissionData to OrganizationPermission for GraphQL
}
