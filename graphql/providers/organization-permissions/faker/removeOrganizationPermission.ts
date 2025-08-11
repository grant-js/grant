import { MutationRemoveOrganizationPermissionArgs } from '@/graphql/generated/types';
import { deleteOrganizationPermissionByOrganizationAndPermission } from '@/graphql/providers/organization-permissions/faker/dataStore';

export async function removeOrganizationPermission({
  input,
}: MutationRemoveOrganizationPermissionArgs): Promise<boolean> {
  const deletedOrganizationPermission = deleteOrganizationPermissionByOrganizationAndPermission(
    input.organizationId,
    input.permissionId
  );
  if (!deletedOrganizationPermission) {
    throw new Error(
      `OrganizationPermission relationship not found for organization ${input.organizationId} and permission ${input.permissionId}`
    );
  }
  return deletedOrganizationPermission !== null;
}
