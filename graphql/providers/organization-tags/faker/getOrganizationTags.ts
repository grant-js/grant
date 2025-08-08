import { getOrganizationTagsByOrganizationId } from '@/graphql/providers/organization-tags/faker/dataStore';
import {
  GetOrganizationTagsParams,
  GetOrganizationTagsResult,
} from '@/graphql/providers/organization-tags/types';

export async function getOrganizationTags({
  organizationId,
}: GetOrganizationTagsParams): Promise<GetOrganizationTagsResult> {
  return getOrganizationTagsByOrganizationId(organizationId);
}
