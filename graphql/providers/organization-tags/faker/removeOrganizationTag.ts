import { MutationRemoveOrganizationTagArgs, OrganizationTag } from '@/graphql/generated/types';
import { deleteOrganizationTagByOrganizationAndTag } from '@/graphql/providers/organization-tags/faker/dataStore';
export async function removeOrganizationTag({
  input,
}: MutationRemoveOrganizationTagArgs): Promise<OrganizationTag> {
  const deletedOrganizationTag = deleteOrganizationTagByOrganizationAndTag(
    input.organizationId,
    input.tagId
  );
  if (!deletedOrganizationTag) {
    throw new Error('Organization tag relationship not found');
  }
  return deletedOrganizationTag;
}
