import { deleteOrganizationGroupByOrganizationAndGroup } from '@/graphql/providers/organization-groups/faker/dataStore';

import { RemoveOrganizationGroupParams, RemoveOrganizationGroupResult } from '../types';

export async function removeOrganizationGroup({
  input,
}: RemoveOrganizationGroupParams): Promise<RemoveOrganizationGroupResult> {
  const deletedOrganizationGroup = deleteOrganizationGroupByOrganizationAndGroup(
    input.organizationId,
    input.groupId
  );
  return deletedOrganizationGroup !== null;
}
