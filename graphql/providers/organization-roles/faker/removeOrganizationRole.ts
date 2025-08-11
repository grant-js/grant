import { MutationRemoveOrganizationRoleArgs } from '@/graphql/generated/types';
import { deleteOrganizationRoleByOrganizationAndRole } from '@/graphql/providers/organization-roles/faker/dataStore';

export async function removeOrganizationRole({
  input,
}: MutationRemoveOrganizationRoleArgs): Promise<boolean> {
  const deletedOrganizationRole = deleteOrganizationRoleByOrganizationAndRole(
    input.organizationId,
    input.roleId
  );
  if (!deletedOrganizationRole) {
    throw new Error(
      `OrganizationRole relationship not found for organization ${input.organizationId} and role ${input.roleId}`
    );
  }
  return deletedOrganizationRole !== null;
}
