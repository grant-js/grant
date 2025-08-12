import {
  MutationAddOrganizationPermissionArgs,
  OrganizationPermission,
} from '@/graphql/generated/types';
import { addOrganizationPermission as addOrganizationPermissionInStore } from '@/graphql/providers/organization-permissions/faker/dataStore';
export async function addOrganizationPermission({
  input,
}: MutationAddOrganizationPermissionArgs): Promise<OrganizationPermission> {
  const organizationPermissionData = addOrganizationPermissionInStore(
    input.organizationId,
    input.permissionId
  );
  return organizationPermissionData as OrganizationPermission;
}
