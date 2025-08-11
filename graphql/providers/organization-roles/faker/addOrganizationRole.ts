import { MutationAddOrganizationRoleArgs, OrganizationRole } from '@/graphql/generated/types';
import { addOrganizationRole as addOrganizationRoleInStore } from '@/graphql/providers/organization-roles/faker/dataStore';

export async function addOrganizationRole({
  input,
}: MutationAddOrganizationRoleArgs): Promise<OrganizationRole> {
  const organizationRoleData = addOrganizationRoleInStore(input.organizationId, input.roleId);
  return organizationRoleData;
}
