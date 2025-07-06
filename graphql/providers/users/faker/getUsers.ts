import { GetUsersParams, GetUsersResult } from '@/graphql/providers/users/types';
import { getUsers as getUsersFromDataStore } from '@/graphql/providers/users/faker/dataStore';
import { UserSortableField, UserSortOrder } from '@/graphql/generated/types';

const SEARCHABLE_FIELDS = ['name', 'email'] as const;
const DEFAULT_SORT = { field: UserSortableField.Name, order: UserSortOrder.Asc };

export async function getUsers({
  page,
  limit,
  sort,
  search,
}: GetUsersParams): Promise<GetUsersResult> {
  const safePage = typeof page === 'number' && page > 0 ? page : 1;
  const safeLimit = typeof limit === 'number' && limit > 0 ? limit : 50;
  const allUsers = getUsersFromDataStore(sort || DEFAULT_SORT);
  const filteredBySearchUsers = search
    ? allUsers.filter((user) =>
        SEARCHABLE_FIELDS.some((field) => user[field].toLowerCase().includes(search.toLowerCase()))
      )
    : allUsers;
  const totalCount = filteredBySearchUsers.length;
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
