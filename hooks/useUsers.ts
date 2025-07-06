import { useQuery, ApolloError } from '@apollo/client';
import { gql } from '@apollo/client';
import { User, UserSortableField, UserSortOrder, QueryUsersArgs } from '@/graphql/generated/types';
import { UsersQueryResult } from '@/components/features/users/types';

export const GET_USERS = gql`
  query GetUsers($page: Int!, $limit: Int!, $sort: UserSortInput, $search: String) {
    users(page: $page, limit: $limit, sort: $sort, search: $search) {
      users {
        id
        name
        email
        roles {
          id
          name
        }
      }
      totalCount
      hasNextPage
    }
  }
`;

interface UseUsersOptions extends Partial<QueryUsersArgs> {}

interface UseUsersResult {
  users: User[];
  loading: boolean;
  error: ApolloError | undefined;
  totalCount: number;
  refetch: () => Promise<any>;
}

export function useUsers(options: UseUsersOptions = {}): UseUsersResult {
  const {
    page = 1,
    limit = 50, // Default to 50 for pagination
    search = '',
    sort = { field: UserSortableField.Name, order: UserSortOrder.Asc },
  } = options;

  const { data, loading, error, refetch } = useQuery<UsersQueryResult>(GET_USERS, {
    variables: {
      page,
      limit,
      search,
      sort,
    },
  });

  return {
    users: data?.users?.users || [],
    loading,
    error,
    totalCount: data?.users?.totalCount || 0,
    refetch,
  };
}
