import {
  QueryUsersArgs,
  UserPage,
  UserSortableField,
  UserSortOrder,
} from '@/graphql/generated/types';
import { getUserTagsByTagId } from '@/graphql/providers/user-tags/faker/dataStore';
import { getUsers as getUsersFromDataStore } from '@/graphql/providers/users/faker/dataStore';

const SEARCHABLE_FIELDS = ['name', 'email'] as const;
const DEFAULT_SORT = { field: UserSortableField.Name, order: UserSortOrder.Asc };

export async function getUsers({
  page,
  limit,
  sort,
  search,
  ids,
  tagIds,
}: QueryUsersArgs): Promise<UserPage> {
  const safePage = typeof page === 'number' && page > 0 ? page : 1;
  const safeLimit = typeof limit === 'number' ? limit : 50;

  // Start with all users or filter by IDs if provided
  let allUsers =
    ids && ids.length > 0
      ? getUsersFromDataStore(sort || DEFAULT_SORT, ids)
      : getUsersFromDataStore(sort || DEFAULT_SORT);

  // Filter by tag IDs if provided
  if (tagIds && tagIds.length > 0) {
    // Get all user-tag relationships for the specified tag IDs
    const userTagRelationships = tagIds.flatMap((tagId: string) => getUserTagsByTagId(tagId));

    // Extract unique user IDs that have at least one of the specified tags
    const userIdsWithTags = [...new Set(userTagRelationships.map((ut) => ut.userId))];
    // Filter users to only include those with the specified tags
    allUsers = allUsers.filter((user) => userIdsWithTags.includes(user.id));
  }

  // Filter by search term
  const filteredBySearchUsers = search
    ? allUsers.filter((user) =>
        SEARCHABLE_FIELDS.some((field) => user[field].toLowerCase().includes(search.toLowerCase()))
      )
    : allUsers;

  const totalCount = filteredBySearchUsers.length;

  // If limit is 0 or negative, return all filtered results without pagination
  if (safeLimit <= 0) {
    return {
      users: filteredBySearchUsers,
      totalCount,
      hasNextPage: false, // No pagination when limit is 0 or negative
    };
  }

  // Apply pagination for normal queries or when limit is specified
  const hasNextPage = safePage < Math.ceil(totalCount / safeLimit);
  const startIndex = (safePage - 1) * safeLimit;
  const endIndex = startIndex + safeLimit;
  const users = filteredBySearchUsers.slice(startIndex, endIndex);

  return {
    users,
    totalCount,
    hasNextPage,
  };
}
