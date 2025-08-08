import { deleteOrganizationTagByOrganizationAndTag } from '@/graphql/providers/organization-tags/faker/dataStore';
import {
  RemoveOrganizationTagParams,
  RemoveOrganizationTagResult,
} from '@/graphql/providers/organization-tags/types';

export async function removeOrganizationTag({
  input,
}: RemoveOrganizationTagParams): Promise<RemoveOrganizationTagResult> {
  const deletedOrganizationTag = deleteOrganizationTagByOrganizationAndTag(
    input.organizationId,
    input.tagId
  );
  return deletedOrganizationTag !== null;
}
