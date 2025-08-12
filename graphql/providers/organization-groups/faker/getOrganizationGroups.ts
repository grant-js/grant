import { OrganizationGroup, QueryOrganizationGroupsArgs } from '@/graphql/generated/types';
import { getOrganizationGroupsByOrganizationId } from '@/graphql/providers/organization-groups/faker/dataStore';
export async function getOrganizationGroups({
  organizationId,
}: QueryOrganizationGroupsArgs): Promise<OrganizationGroup[]> {
  return getOrganizationGroupsByOrganizationId(organizationId);
}
