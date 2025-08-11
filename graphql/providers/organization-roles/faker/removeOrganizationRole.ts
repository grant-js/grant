import { MutationRemoveOrganizationRoleArgs, OrganizationRole } from '@/graphql/generated/types';
import { deleteOrganizationRoleByOrganizationAndRole } from '@/graphql/providers/organization-roles/faker/dataStore';

export async function removeOrganizationRole({
  input,
}: MutationRemoveOrganizationRoleArgs): Promise<OrganizationRole> {
  const deletedOrganizationRole = deleteOrganizationRoleByOrganizationAndRole(
    input.organizationId,
    input.roleId
  );

  if (!deletedOrganizationRole) {
    throw new Error('Organization role relationship not found');
  }

  return deletedOrganizationRole;
}
