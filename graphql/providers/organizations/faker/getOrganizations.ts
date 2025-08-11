import { OrganizationPage, QueryOrganizationsArgs } from '@/graphql/generated/types';
import { getOrganizations as getOrganizationsFromStore } from '@/graphql/providers/organizations/faker/dataStore';

const SEARCHABLE_FIELDS = ['name', 'slug'] as const;

export async function getOrganizations({
  page,
  limit,
  search,
  sort,
  ids,
}: QueryOrganizationsArgs): Promise<OrganizationPage> {
  // If ids are provided and not empty, ignore pagination and return filtered results
  if (ids && ids.length > 0) {
    const filteredOrganizations = getOrganizationsFromStore(sort || undefined, ids);
    return {
      organizations: filteredOrganizations,
      totalCount: filteredOrganizations.length,
      hasNextPage: false, // No pagination when filtering by IDs
    };
  }

  const safePage = typeof page === 'number' && page > 0 ? page : 1;
  const safeLimit = typeof limit === 'number' && limit > 0 ? limit : 10;
  let allOrganizations = getOrganizationsFromStore(sort || undefined);

  // Filter by search term
  const filteredBySearchOrganizations = search
    ? allOrganizations.filter((org) =>
        SEARCHABLE_FIELDS.some((field) => org[field].toLowerCase().includes(search.toLowerCase()))
      )
    : allOrganizations;

  // Calculate pagination
  const totalCount = filteredBySearchOrganizations.length;
  const hasNextPage = safePage < Math.ceil(totalCount / safeLimit);
  const startIndex = (safePage - 1) * safeLimit;
  const endIndex = startIndex + safeLimit;
  const organizations = filteredBySearchOrganizations.slice(startIndex, endIndex);

  return {
    organizations,
    totalCount,
    hasNextPage,
  };
}
