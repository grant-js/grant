import { OrganizationTag, QueryOrganizationTagsArgs } from '@/graphql/generated/types';
import { getOrganizationTagsByOrganizationId } from '@/graphql/providers/organization-tags/faker/dataStore';

export async function getOrganizationTags({
  organizationId,
}: QueryOrganizationTagsArgs): Promise<OrganizationTag[]> {
  return getOrganizationTagsByOrganizationId(organizationId);
}
