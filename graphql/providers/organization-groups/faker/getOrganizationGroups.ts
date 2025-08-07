import { getOrganizationGroupsByOrganizationId } from '@/graphql/providers/organization-groups/faker/dataStore';
import {
  GetOrganizationGroupsParams,
  GetOrganizationGroupsResult,
} from '@/graphql/providers/organization-groups/types';

export async function getOrganizationGroups({
  organizationId,
}: GetOrganizationGroupsParams): Promise<GetOrganizationGroupsResult> {
  return getOrganizationGroupsByOrganizationId(organizationId);
}
