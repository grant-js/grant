import { GetTagsParams, GetTagsResult, TagData } from '@/graphql/providers/tags/types';
import { getTags as getTagsFromStore } from './dataStore';
import { TagSortField, SortDirection } from '@/graphql/generated/types';

const SEARCHABLE_FIELDS = ['name', 'color'] as const;
const DEFAULT_SORT = { field: TagSortField.Name, direction: SortDirection.Asc };

export const getTags = async (params: GetTagsParams): Promise<GetTagsResult> => {
  const { page = 1, limit = 50, sort, search, ids } = params;

  // If ids are provided and not empty, ignore pagination and return filtered results
  if (ids && ids.length > 0) {
    const filteredTags = getTagsFromStore(sort || DEFAULT_SORT, ids);

    return {
      tags: filteredTags,
      totalCount: filteredTags.length,
      hasNextPage: false, // No pagination when filtering by IDs
    };
  }

  // Ensure page and limit are always numbers
  const safePage = typeof page === 'number' && page > 0 ? page : 1;
  const safeLimit = typeof limit === 'number' && limit > 0 ? limit : 50;

  let allTags = getTagsFromStore(sort || DEFAULT_SORT);

  // Filter by search
  if (search) {
    const lowerSearch = search.toLowerCase();
    allTags = allTags.filter((tag) =>
      SEARCHABLE_FIELDS.some((field) =>
        (tag[field] ? String(tag[field]).toLowerCase() : '').includes(lowerSearch)
      )
    );
  }

  // Pagination
  const totalCount = allTags.length;
  const startIndex = (safePage - 1) * safeLimit;
  const endIndex = startIndex + safeLimit;
  const tags = allTags.slice(startIndex, endIndex);
  const hasNextPage = safePage < Math.ceil(totalCount / safeLimit);

  return {
    tags,
    totalCount,
    hasNextPage,
  };
};
