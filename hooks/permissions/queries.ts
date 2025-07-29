import { gql } from '@apollo/client';

export const GET_PERMISSIONS = gql`
  query GetPermissions(
    $page: Int!
    $limit: Int!
    $sort: PermissionSortInput
    $search: String
    $ids: [ID!]
  ) {
    permissions(page: $page, limit: $limit, sort: $sort, search: $search, ids: $ids) {
      permissions {
        id
        name
        action
        description
        tags {
          id
          name
          color
        }
        createdAt
        updatedAt
      }
      totalCount
      hasNextPage
    }
  }
`;
