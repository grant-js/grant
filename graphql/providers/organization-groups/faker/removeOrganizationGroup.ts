import { MutationRemoveOrganizationGroupArgs } from '@/graphql/generated/types';
import { deleteOrganizationGroupByOrganizationAndGroup } from '@/graphql/providers/organization-groups/faker/dataStore';

export async function removeOrganizationGroup({
  input,
}: MutationRemoveOrganizationGroupArgs): Promise<boolean> {
  const deletedOrganizationGroup = deleteOrganizationGroupByOrganizationAndGroup(
    input.organizationId,
    input.groupId
  );
  if (!deletedOrganizationGroup) {
    throw new Error(
      `OrganizationGroup relationship not found for organization ${input.organizationId} and group ${input.groupId}`
    );
  }
  return deletedOrganizationGroup !== null;
}
