import { GetPermissionsParams, GetPermissionsResult } from '../types';
import { getPermissions as getPermissionsFromDataStore } from './dataStore';
import { PermissionSortableField, PermissionSortOrder } from '@/graphql/generated/types';

const SEARCHABLE_FIELDS = ['name', 'description'] as const;
const DEFAULT_SORT = { field: PermissionSortableField.Name, order: PermissionSortOrder.Asc };

export async function getPermissions({
  page = 1,
  limit = 50,
  sort,
  search,
}: GetPermissionsParams): Promise<GetPermissionsResult> {
  // Ensure page and limit are always numbers
  const safePage = typeof page === 'number' && page > 0 ? page : 1;
  const safeLimit = typeof limit === 'number' && limit > 0 ? limit : 50;

  let allPermissions = getPermissionsFromDataStore(sort || DEFAULT_SORT);

  // Filter by search (same logic as user provider)
  if (search) {
    const lowerSearch = search.toLowerCase();
    allPermissions = allPermissions.filter((permission) =>
      SEARCHABLE_FIELDS.some((field) =>
        (permission[field] ? String(permission[field]).toLowerCase() : '').includes(lowerSearch)
      )
    );
  }

  // Pagination
  const totalCount = allPermissions.length;
  const startIndex = (safePage - 1) * safeLimit;
  const endIndex = startIndex + safeLimit;
  const permissions = allPermissions.slice(startIndex, endIndex);
  const hasNextPage = safePage < Math.ceil(totalCount / safeLimit);

  return {
    permissions,
    totalCount,
    hasNextPage,
  };
}
