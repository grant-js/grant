import {
  GroupPage,
  GroupSortableField,
  GroupSortOrder,
  QueryGroupsArgs,
} from '@/graphql/generated/types';
import { getGroupTagsByTagId } from '@/graphql/providers/group-tags/faker/dataStore';
import { getGroups as getGroupsFromDataStore } from '@/graphql/providers/groups/faker/dataStore';
const SEARCHABLE_FIELDS = ['name', 'description'] as const;
const DEFAULT_SORT = { field: GroupSortableField.Name, order: GroupSortOrder.Asc };
export async function getGroups({
  page,
  limit,
  sort,
  search,
  ids,
  tagIds,
}: QueryGroupsArgs): Promise<GroupPage> {
  const safePage = typeof page === 'number' && page > 0 ? page : 1;
  const safeLimit = typeof limit === 'number' ? limit : 50;
  let allGroups =
    ids && ids.length > 0
      ? getGroupsFromDataStore(sort || DEFAULT_SORT, ids)
      : getGroupsFromDataStore(sort || DEFAULT_SORT);
  if (tagIds && tagIds.length > 0) {
    const groupTagRelationships = tagIds.flatMap((tagId: string) => getGroupTagsByTagId(tagId));
    const groupIdsWithTags = [...new Set(groupTagRelationships.map((gt) => gt.groupId))];
    allGroups = allGroups.filter((group) => groupIdsWithTags.includes(group.id));
  }
  const filteredBySearchGroups = search
    ? allGroups.filter((group) =>
        SEARCHABLE_FIELDS.some((field) =>
          (group[field] ? String(group[field]).toLowerCase() : '').includes(search.toLowerCase())
        )
      )
    : allGroups;
  const totalCount = filteredBySearchGroups.length;
  if (safeLimit <= 0) {
    return {
      groups: filteredBySearchGroups,
      totalCount,
      hasNextPage: false,
    };
  }
  const hasNextPage = safePage < Math.ceil(totalCount / safeLimit);
  const startIndex = (safePage - 1) * safeLimit;
  const endIndex = startIndex + safeLimit;
  const groups = filteredBySearchGroups.slice(startIndex, endIndex);
  return {
    groups,
    totalCount,
    hasNextPage,
  };
}
