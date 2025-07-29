import { GroupSortableField, GroupSortOrder, Group } from '@/graphql/generated/types';
import { getGroups as getGroupsFromDataStore } from '@/graphql/providers/groups/faker/dataStore';
import { GetGroupsParams, GetGroupsResult } from '@/graphql/providers/groups/types';

const SEARCHABLE_FIELDS = ['name', 'description'] as const;
const DEFAULT_SORT = { field: GroupSortableField.Name, order: GroupSortOrder.Asc };

export async function getGroups({
  page = 1,
  limit = 50,
  sort,
  search,
  ids,
}: GetGroupsParams): Promise<GetGroupsResult> {
  // If ids are provided and not empty, ignore pagination and return filtered results
  if (ids && ids.length > 0) {
    const filteredGroups = getGroupsFromDataStore(sort || DEFAULT_SORT, ids);
    return {
      groups: filteredGroups as Group[],
      totalCount: filteredGroups.length,
      hasNextPage: false, // No pagination when filtering by IDs
    };
  }

  const safePage = typeof page === 'number' && page > 0 ? page : 1;
  const safeLimit = typeof limit === 'number' && limit > 0 ? limit : 50;
  const allGroups = getGroupsFromDataStore(sort || DEFAULT_SORT);
  const filteredBySearchGroups = search
    ? allGroups.filter((group) =>
        SEARCHABLE_FIELDS.some((field) =>
          (group[field] ? String(group[field]).toLowerCase() : '').includes(search.toLowerCase())
        )
      )
    : allGroups;
  const totalCount = filteredBySearchGroups.length;
  const hasNextPage = safePage < Math.ceil(totalCount / safeLimit);
  const startIndex = (safePage - 1) * safeLimit;
  const endIndex = startIndex + safeLimit;
  const groups = filteredBySearchGroups.slice(startIndex, endIndex);

  return {
    groups: groups as Group[],
    totalCount,
    hasNextPage,
  };
}
