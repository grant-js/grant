import { MutationAddOrganizationTagArgs, OrganizationTag } from '@/graphql/generated/types';
import { addOrganizationTag as addOrganizationTagToStore } from '@/graphql/providers/organization-tags/faker/dataStore';
export async function addOrganizationTag({
  input,
}: MutationAddOrganizationTagArgs): Promise<OrganizationTag> {
  const organizationTag = addOrganizationTagToStore(input.organizationId, input.tagId);
  return organizationTag;
}
