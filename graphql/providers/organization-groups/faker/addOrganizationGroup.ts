import { OrganizationGroup } from '@/graphql/generated/types';
import { addOrganizationGroup as addOrganizationGroupInStore } from '@/graphql/providers/organization-groups/faker/dataStore';

import { AddOrganizationGroupParams, AddOrganizationGroupResult } from '../types';

export async function addOrganizationGroup({
  input,
}: AddOrganizationGroupParams): Promise<AddOrganizationGroupResult> {
  const organizationGroupData = addOrganizationGroupInStore(input.organizationId, input.groupId);
  return organizationGroupData as OrganizationGroup; // Convert OrganizationGroupData to OrganizationGroup for GraphQL
}
