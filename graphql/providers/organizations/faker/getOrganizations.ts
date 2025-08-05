import { getOrganizations as getOrganizationsFromStore } from '@/graphql/providers/organizations/faker/dataStore';
import {
  GetOrganizationsParams,
  GetOrganizationsResult,
} from '@/graphql/providers/organizations/types';

export async function getOrganizations({
  page,
  limit,
  search,
  sort,
  ids,
}: GetOrganizationsParams): Promise<GetOrganizationsResult> {
  // Get all organizations from the store
  let organizations = getOrganizationsFromStore(sort || undefined);

  // Apply ID filter if provided
  if (ids && ids.length > 0) {
    organizations = organizations.filter((org) => ids.includes(org.id));
  }

  // Apply search filter if provided
  if (search) {
    organizations = organizations.filter(
      (org) =>
        org.name.toLowerCase().includes(search.toLowerCase()) ||
        org.slug.toLowerCase().includes(search.toLowerCase())
    );
  }

  // Calculate pagination
  const totalCount = organizations.length;
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  const paginatedOrganizations = organizations.slice(startIndex, endIndex);

  // Check if there are more pages
  const hasNextPage = endIndex < totalCount;

  return {
    organizations: paginatedOrganizations,
    totalCount,
    hasNextPage,
  };
}
