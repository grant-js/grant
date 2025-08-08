import { gql } from '@apollo/client';

export const GET_ROLES = gql`
  query GetRoles(
    $scope: Scope!
    $page: Int
    $limit: Int
    $sort: RoleSortInput
    $search: String
    $ids: [ID!]
    $tagIds: [ID!]
  ) {
    roles(
      scope: $scope
      page: $page
      limit: $limit
      sort: $sort
      search: $search
      ids: $ids
      tagIds: $tagIds
    ) {
      roles {
        id
        name
        description
        createdAt
        updatedAt
        groups(scope: $scope) {
          id
          name
          tags(scope: $scope) {
            id
            name
            color
          }
        }
        tags(scope: $scope) {
          id
          name
          color
        }
      }
      totalCount
      hasNextPage
    }
  }
`;
