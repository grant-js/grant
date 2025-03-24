import { GetUsersParams, GetUsersResult } from '../types';
import { getUsers as getUsersFromDataStore } from './dataStore';
import { UserSortableField, UserSortOrder } from '@/graphql/generated/types';

const SEARCHABLE_FIELDS = ['name', 'email'] as const;

export async function getUsers({
  page,
  limit,
  sort,
  search,
}: GetUsersParams): Promise<GetUsersResult> {
  const defaultSort = { field: UserSortableField.Name, order: UserSortOrder.Asc };
  const allUsers = getUsersFromDataStore(sort || defaultSort);
  const filteredBySearchUsers = search
    ? allUsers.filter((user) =>
        SEARCHABLE_FIELDS.some((field) => user[field].toLowerCase().includes(search.toLowerCase()))
      )
    : allUsers;
  const totalCount = filteredBySearchUsers.length;
  const hasNextPage = page < Math.ceil(totalCount / limit);
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  const users = filteredBySearchUsers.slice(startIndex, endIndex);

  return {
    users,
    totalCount,
    hasNextPage,
  };
}
