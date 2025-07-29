import {
  PermissionSortableField,
  PermissionSortOrder,
  Permission,
} from '@/graphql/generated/types';
import { getPermissions as getPermissionsFromDataStore } from '@/graphql/providers/permissions/faker/dataStore';
import { GetPermissionsParams, GetPermissionsResult } from '@/graphql/providers/permissions/types';

const SEARCHABLE_FIELDS = ['name', 'description', 'action'] as const;
const DEFAULT_SORT = { field: PermissionSortableField.Name, order: PermissionSortOrder.Asc };

export async function getPermissions({
  page = 1,
  limit = 50,
  sort,
  search,
  ids,
}: GetPermissionsParams): Promise<GetPermissionsResult> {
  // If ids are provided and not empty, ignore pagination and return filtered results
  if (ids && ids.length > 0) {
    const filteredPermissions = getPermissionsFromDataStore(sort || DEFAULT_SORT, ids);
    return {
      permissions: filteredPermissions as Permission[],
      totalCount: filteredPermissions.length,
      hasNextPage: false, // No pagination when filtering by IDs
    };
  }

  const safePage = typeof page === 'number' && page > 0 ? page : 1;
  const safeLimit = typeof limit === 'number' && limit > 0 ? limit : 50;
  const allPermissions = getPermissionsFromDataStore(sort || DEFAULT_SORT);
  const filteredBySearchPermissions = search
    ? allPermissions.filter((permission) =>
        SEARCHABLE_FIELDS.some((field) =>
          (permission[field] ? String(permission[field]).toLowerCase() : '').includes(
            search.toLowerCase()
          )
        )
      )
    : allPermissions;
  const totalCount = filteredBySearchPermissions.length;
  const hasNextPage = safePage < Math.ceil(totalCount / safeLimit);
  const startIndex = (safePage - 1) * safeLimit;
  const endIndex = startIndex + safeLimit;
  const permissions = filteredBySearchPermissions.slice(startIndex, endIndex);

  return {
    permissions: permissions as Permission[],
    totalCount,
    hasNextPage,
  };
}
