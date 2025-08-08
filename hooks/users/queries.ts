import { gql } from '@apollo/client';

export const GET_USERS = gql`
  query GetUsers(
    $scope: Scope!
    $page: Int
    $limit: Int
    $sort: UserSortInput
    $search: String
    $ids: [ID!]
    $tagIds: [ID!]
  ) {
    users(
      scope: $scope
      page: $page
      limit: $limit
      sort: $sort
      search: $search
      ids: $ids
      tagIds: $tagIds
    ) {
      users {
        id
        name
        email
        createdAt
        updatedAt
        roles {
          id
          name
          tags {
            id
            name
            color
          }
        }
        tags {
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
