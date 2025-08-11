import {
  MutationRemoveOrganizationPermissionArgs,
  OrganizationPermission,
} from '@/graphql/generated/types';
import { deleteOrganizationPermissionByOrganizationAndPermission } from '@/graphql/providers/organization-permissions/faker/dataStore';

export async function removeOrganizationPermission({
  input,
}: MutationRemoveOrganizationPermissionArgs): Promise<OrganizationPermission> {
  const deletedOrganizationPermission = deleteOrganizationPermissionByOrganizationAndPermission(
    input.organizationId,
    input.permissionId
  );

  if (!deletedOrganizationPermission) {
    throw new Error('Organization permission relationship not found');
  }

  return deletedOrganizationPermission;
}
