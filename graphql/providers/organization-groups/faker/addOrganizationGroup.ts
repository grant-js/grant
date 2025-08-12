import { MutationAddOrganizationGroupArgs, OrganizationGroup } from '@/graphql/generated/types';
import { addOrganizationGroup as addOrganizationGroupInStore } from '@/graphql/providers/organization-groups/faker/dataStore';
export async function addOrganizationGroup({
  input,
}: MutationAddOrganizationGroupArgs): Promise<OrganizationGroup> {
  const organizationGroupData = addOrganizationGroupInStore(input.organizationId, input.groupId);
  return organizationGroupData;
}
