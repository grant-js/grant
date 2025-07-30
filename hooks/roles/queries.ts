import { gql } from '@apollo/client';

export const GET_ROLES = gql`
  query GetRoles(
    $page: Int!
    $limit: Int!
    $sort: RoleSortInput
    $search: String
    $ids: [ID!]
    $tagIds: [ID!]
  ) {
    roles(page: $page, limit: $limit, sort: $sort, search: $search, ids: $ids, tagIds: $tagIds) {
      roles {
        id
        name
        description
        createdAt
        updatedAt
        groups {
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
