import { getOrganizationUsersByOrganizationId } from '@/graphql/providers/organization-users/faker/dataStore';
import {
  GetOrganizationUsersParams,
  GetOrganizationUsersResult,
} from '@/graphql/providers/organization-users/types';

export async function getOrganizationUsers({
  organizationId,
}: GetOrganizationUsersParams): Promise<GetOrganizationUsersResult> {
  return getOrganizationUsersByOrganizationId(organizationId);
}
