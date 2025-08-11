import { OrganizationUser, QueryOrganizationUsersArgs } from '@/graphql/generated/types';
import { getOrganizationUsersByOrganizationId } from '@/graphql/providers/organization-users/faker/dataStore';

export async function getOrganizationUsers({
  organizationId,
}: QueryOrganizationUsersArgs): Promise<OrganizationUser[]> {
  return getOrganizationUsersByOrganizationId(organizationId);
}
