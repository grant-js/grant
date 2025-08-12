import { TagSortField, SortDirection, QueryTagsArgs, TagPage } from '@/graphql/generated/types';

import { getTags as getTagsFromStore } from './dataStore';
const SEARCHABLE_FIELDS = ['name', 'color'] as const;
const DEFAULT_SORT = { field: TagSortField.Name, direction: SortDirection.Asc };
export const getTags = async (params: QueryTagsArgs): Promise<TagPage> => {
  const { page = 1, limit = 50, sort, search, ids } = params;
  const safePage = typeof page === 'number' && page > 0 ? page : 1;
  const safeLimit = typeof limit === 'number' ? limit : 50;
  let allTags =
    ids && ids.length > 0
      ? getTagsFromStore(sort || DEFAULT_SORT, ids)
      : getTagsFromStore(sort || DEFAULT_SORT);
  const filteredBySearchTags = search
    ? allTags.filter((tag) =>
        SEARCHABLE_FIELDS.some((field) =>
          (tag[field] ? String(tag[field]).toLowerCase() : '').includes(search.toLowerCase())
        )
      )
    : allTags;
  const totalCount = filteredBySearchTags.length;
  if (safeLimit <= 0) {
    return {
      tags: filteredBySearchTags,
      totalCount,
      hasNextPage: false,
    };
  }
  const hasNextPage = safePage < Math.ceil(totalCount / safeLimit);
  const startIndex = (safePage - 1) * safeLimit;
  const endIndex = startIndex + safeLimit;
  const tags = filteredBySearchTags.slice(startIndex, endIndex);
  return {
    tags,
    totalCount,
    hasNextPage,
  };
};
