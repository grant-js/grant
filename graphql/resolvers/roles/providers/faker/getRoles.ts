import { GetRolesParams, GetRolesResult } from '../types';
import { getRoles as getRolesFromDataStore } from './dataStore';
import { RoleSortableField, RoleSortOrder } from '@/graphql/generated/types';

const SEARCHABLE_FIELDS = ['label', 'description'] as const;
const DEFAULT_SORT = { field: RoleSortableField.Name, order: RoleSortOrder.Asc };

export async function getRoles({
  page = 1,
  limit = 50,
  sort,
  search,
}: GetRolesParams): Promise<GetRolesResult> {
  // Ensure page and limit are always numbers
  const safePage = typeof page === 'number' && page > 0 ? page : 1;
  const safeLimit = typeof limit === 'number' && limit > 0 ? limit : 50;

  let allRoles = getRolesFromDataStore(sort || DEFAULT_SORT);

  // Filter by search (same logic as user provider)
  if (search) {
    const lowerSearch = search.toLowerCase();
    allRoles = allRoles.filter((role) =>
      SEARCHABLE_FIELDS.some((field) =>
        (role[field] ? String(role[field]).toLowerCase() : '').includes(lowerSearch)
      )
    );
  }

  // Pagination
  const totalCount = allRoles.length;
  const startIndex = (safePage - 1) * safeLimit;
  const endIndex = startIndex + safeLimit;
  const roles = allRoles.slice(startIndex, endIndex);
  const hasNextPage = safePage < Math.ceil(totalCount / safeLimit);

  return {
    roles,
    totalCount,
    hasNextPage,
  };
}
