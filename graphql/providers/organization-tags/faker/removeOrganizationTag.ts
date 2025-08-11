import { MutationRemoveOrganizationTagArgs } from '@/graphql/generated/types';
import { deleteOrganizationTagByOrganizationAndTag } from '@/graphql/providers/organization-tags/faker/dataStore';

export async function removeOrganizationTag({
  input,
}: MutationRemoveOrganizationTagArgs): Promise<boolean> {
  const deletedOrganizationTag = deleteOrganizationTagByOrganizationAndTag(
    input.organizationId,
    input.tagId
  );
  if (!deletedOrganizationTag) {
    throw new Error(
      `OrganizationTag relationship not found for organization ${input.organizationId} and tag ${input.tagId}`
    );
  }
  return deletedOrganizationTag !== null;
}
