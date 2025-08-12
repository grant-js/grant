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
  let allUsers =
    ids && ids.length > 0
      ? getUsersFromDataStore(sort || DEFAULT_SORT, ids)
      : getUsersFromDataStore(sort || DEFAULT_SORT);
  if (tagIds && tagIds.length > 0) {
    const userTagRelationships = tagIds.flatMap((tagId: string) => getUserTagsByTagId(tagId));
    const userIdsWithTags = [...new Set(userTagRelationships.map((ut) => ut.userId))];
    allUsers = allUsers.filter((user) => userIdsWithTags.includes(user.id));
  }
  const filteredBySearchUsers = search
    ? allUsers.filter((user) =>
        SEARCHABLE_FIELDS.some((field) => user[field].toLowerCase().includes(search.toLowerCase()))
      )
    : allUsers;
  const totalCount = filteredBySearchUsers.length;
  if (safeLimit <= 0) {
    return {
      users: filteredBySearchUsers,
      totalCount,
      hasNextPage: false,
    };
  }
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
