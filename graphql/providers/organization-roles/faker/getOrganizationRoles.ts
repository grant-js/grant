import { OrganizationRole, QueryOrganizationRolesArgs } from '@/graphql/generated/types';
import { getOrganizationRolesByOrganizationId } from '@/graphql/providers/organization-roles/faker/dataStore';

export async function getOrganizationRoles({
  organizationId,
}: QueryOrganizationRolesArgs): Promise<OrganizationRole[]> {
  return getOrganizationRolesByOrganizationId(organizationId);
}
