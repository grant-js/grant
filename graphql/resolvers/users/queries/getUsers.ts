import { QueryResolvers, User, UserSortableField } from '@/graphql/generated/types';
import { getUsers, SortConfig } from '../providers/faker/dataStore';

export const getUsersResolver: QueryResolvers['users'] = async (
  _parent,
  { page = 1, limit = 10, sort }
) => {
  const sortConfig: SortConfig | undefined = sort
    ? {
        field: sort.field,
        order: sort.order,
      }
    : undefined;

  const users = getUsers(sortConfig);
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;

  const paginatedUsers = users.slice(startIndex, endIndex);
  const totalPages = Math.ceil(users.length / limit);

  return {
    users: paginatedUsers,
    totalCount: users.length,
    currentPage: page,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
  };
};
