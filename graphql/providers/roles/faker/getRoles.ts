import { RoleSortableField, RoleSortOrder } from '@/graphql/generated/types';
import { getRoleTagsByTagId } from '@/graphql/providers/role-tags/faker/dataStore';
import { getRoles as getRolesFromDataStore } from '@/graphql/providers/roles/faker/dataStore';
import { GetRolesParams, GetRolesResult } from '@/graphql/providers/roles/types';

const SEARCHABLE_FIELDS = ['name', 'description'] as const;
const DEFAULT_SORT = { field: RoleSortableField.Name, order: RoleSortOrder.Asc };

export async function getRoles({
  page = 1,
  limit = 50,
  sort,
  search,
  ids,
  tagIds,
}: GetRolesParams): Promise<GetRolesResult> {
  const safePage = typeof page === 'number' && page > 0 ? page : 1;
  const safeLimit = typeof limit === 'number' ? limit : 50;

  // Start with all roles or filter by IDs if provided
  let allRoles =
    ids && ids.length > 0
      ? getRolesFromDataStore(sort || DEFAULT_SORT, ids)
      : getRolesFromDataStore(sort || DEFAULT_SORT);

  // Filter by tag IDs if provided
  if (tagIds && tagIds.length > 0) {
    // Get all role-tag relationships for the specified tag IDs
    const roleTagRelationships = tagIds.flatMap((tagId: string) => getRoleTagsByTagId(tagId));

    // Extract unique role IDs that have at least one of the specified tags
    const roleIdsWithTags = [...new Set(roleTagRelationships.map((rt) => rt.roleId))];

    // Filter roles to only include those with the specified tags
    allRoles = allRoles.filter((role) => roleIdsWithTags.includes(role.id));
  }

  // Filter by search (same logic as user provider)
  const filteredBySearchRoles = search
    ? allRoles.filter((role) =>
        SEARCHABLE_FIELDS.some((field) =>
          (role[field] ? String(role[field]).toLowerCase() : '').includes(search.toLowerCase())
        )
      )
    : allRoles;

  const totalCount = filteredBySearchRoles.length;

  // If limit is 0 or negative, return all filtered results without pagination
  if (safeLimit <= 0) {
    return {
      roles: filteredBySearchRoles,
      totalCount,
      hasNextPage: false, // No pagination when limit is 0 or negative
    };
  }

  // Apply pagination for normal queries or when limit is specified
  const hasNextPage = safePage < Math.ceil(totalCount / safeLimit);
  const startIndex = (safePage - 1) * safeLimit;
  const endIndex = startIndex + safeLimit;
  const roles = filteredBySearchRoles.slice(startIndex, endIndex);

  return {
    roles,
    totalCount,
    hasNextPage,
  };
}
