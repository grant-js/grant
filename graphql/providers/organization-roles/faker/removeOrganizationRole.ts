import { deleteOrganizationRoleByOrganizationAndRole } from '@/graphql/providers/organization-roles/faker/dataStore';

import { RemoveOrganizationRoleParams, RemoveOrganizationRoleResult } from '../types';

export async function removeOrganizationRole({
  input,
}: RemoveOrganizationRoleParams): Promise<RemoveOrganizationRoleResult> {
  const deletedOrganizationRole = deleteOrganizationRoleByOrganizationAndRole(
    input.organizationId,
    input.roleId
  );
  return deletedOrganizationRole !== null;
}
