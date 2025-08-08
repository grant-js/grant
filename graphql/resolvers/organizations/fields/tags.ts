import { OrganizationResolvers, Tenant } from '@/graphql/generated/types';

export const organizationTagsResolver: OrganizationResolvers['tags'] = async (
  parent,
  _args,
  context
) => {
  const organizationId = parent.id;
  // Get organization-tag relationships for this organization
  const organizationTags = await context.providers.organizationTags.getOrganizationTags({
    organizationId,
  });

  // Extract tag IDs from organization-tag relationships
  const tagIds = organizationTags.map((ot) => ot.tagId);

  if (tagIds.length === 0) {
    return [];
  }

  // Get tags by IDs (optimized - no need to fetch all tags)
  const tagsResult = await context.providers.tags.getTags({
    ids: tagIds,
    scope: {
      tenant: Tenant.Organization,
      id: organizationId,
    },
    limit: -1,
  });

  return tagsResult.tags;
};
