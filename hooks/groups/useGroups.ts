import { useQuery, ApolloError } from '@apollo/client';
import { gql } from '@apollo/client';
import {
  Group,
  GroupSortableField,
  GroupSortOrder,
  QueryGroupsArgs,
} from '@/graphql/generated/types';

export const GET_GROUPS = gql`
  query GetGroups($page: Int!, $limit: Int!, $sort: GroupSortInput, $search: String, $ids: [ID!]) {
    groups(page: $page, limit: $limit, sort: $sort, search: $search, ids: $ids) {
      groups {
        id
        name
        description
        permissions {
          id
          name
          action
          description
        }
      }
      totalCount
      hasNextPage
    }
  }
`;

interface UseGroupsOptions extends Partial<QueryGroupsArgs> {}

interface UseGroupsResult {
  groups: Group[];
  loading: boolean;
  error: ApolloError | undefined;
  totalCount: number;
}

export function useGroups(options: UseGroupsOptions = {}): UseGroupsResult {
  const {
    page = 1,
    limit = 1000, // Default to 1000 to get all groups for dropdown
    search = '',
    sort = { field: GroupSortableField.Name, order: GroupSortOrder.Asc },
    ids,
  } = options;

  const { data, loading, error } = useQuery(GET_GROUPS, {
    variables: {
      page,
      limit,
      search,
      sort,
      ids,
    },
  });

  return {
    groups: data?.groups?.groups || [],
    loading,
    error,
    totalCount: data?.groups?.totalCount || 0,
  };
}
