import { GetGroupsParams, GetGroupsResult } from '../types';
import { getGroups as getGroupsFromDataStore } from './dataStore';
import { GroupSortableField, GroupSortOrder } from '@/graphql/generated/types';

const SEARCHABLE_FIELDS = ['name', 'description'] as const;
const DEFAULT_SORT = { field: GroupSortableField.Name, order: GroupSortOrder.Asc };

export async function getGroups({
  page = 1,
  limit = 50,
  sort,
  search,
}: GetGroupsParams): Promise<GetGroupsResult> {
  // Ensure page and limit are always numbers
  const safePage = typeof page === 'number' && page > 0 ? page : 1;
  const safeLimit = typeof limit === 'number' && limit > 0 ? limit : 50;

  let allGroups = getGroupsFromDataStore(sort || DEFAULT_SORT);

  // Filter by search (same logic as user provider)
  if (search) {
    const lowerSearch = search.toLowerCase();
    allGroups = allGroups.filter((group) =>
      SEARCHABLE_FIELDS.some((field) =>
        (group[field] ? String(group[field]).toLowerCase() : '').includes(lowerSearch)
      )
    );
  }

  // Pagination
  const totalCount = allGroups.length;
  const startIndex = (safePage - 1) * safeLimit;
  const endIndex = startIndex + safeLimit;
  const groups = allGroups.slice(startIndex, endIndex);
  const hasNextPage = safePage < Math.ceil(totalCount / safeLimit);

  return {
    groups,
    totalCount,
    hasNextPage,
  };
}
