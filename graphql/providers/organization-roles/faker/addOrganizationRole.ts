import { OrganizationRole } from '@/graphql/generated/types';
import { addOrganizationRole as addOrganizationRoleInStore } from '@/graphql/providers/organization-roles/faker/dataStore';

import { AddOrganizationRoleParams, AddOrganizationRoleResult } from '../types';

export async function addOrganizationRole({
  input,
}: AddOrganizationRoleParams): Promise<AddOrganizationRoleResult> {
  const organizationRoleData = addOrganizationRoleInStore(input.organizationId, input.roleId);
  return organizationRoleData as OrganizationRole; // Convert OrganizationRoleData to OrganizationRole for GraphQL
}
