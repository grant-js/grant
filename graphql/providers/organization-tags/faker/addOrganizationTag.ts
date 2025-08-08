import { addOrganizationTag as addOrganizationTagToStore } from '@/graphql/providers/organization-tags/faker/dataStore';
import {
  AddOrganizationTagParams,
  AddOrganizationTagResult,
} from '@/graphql/providers/organization-tags/types';

export async function addOrganizationTag({
  input,
}: AddOrganizationTagParams): Promise<AddOrganizationTagResult> {
  const organizationTag = addOrganizationTagToStore(input.organizationId, input.tagId);
  return organizationTag as AddOrganizationTagResult;
}
