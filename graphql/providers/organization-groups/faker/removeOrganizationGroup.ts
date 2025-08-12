import { MutationRemoveOrganizationGroupArgs, OrganizationGroup } from '@/graphql/generated/types';
import { deleteOrganizationGroupByOrganizationAndGroup } from '@/graphql/providers/organization-groups/faker/dataStore';
export async function removeOrganizationGroup({
  input,
}: MutationRemoveOrganizationGroupArgs): Promise<OrganizationGroup> {
  const deletedOrganizationGroup = deleteOrganizationGroupByOrganizationAndGroup(
    input.organizationId,
    input.groupId
  );
  if (!deletedOrganizationGroup) {
    throw new Error('Organization group relationship not found');
  }
  return deletedOrganizationGroup;
}
