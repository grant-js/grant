import { getOrganizationRolesByOrganizationId } from '@/graphql/providers/organization-roles/faker/dataStore';
import {
  GetOrganizationRolesParams,
  GetOrganizationRolesResult,
} from '@/graphql/providers/organization-roles/types';

export async function getOrganizationRoles({
  organizationId,
}: GetOrganizationRolesParams): Promise<GetOrganizationRolesResult> {
  return getOrganizationRolesByOrganizationId(organizationId);
}
