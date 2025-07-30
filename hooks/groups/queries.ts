import { gql } from '@apollo/client';

export const GET_GROUPS = gql`
  query GetGroups(
    $page: Int!
    $limit: Int!
    $sort: GroupSortInput
    $search: String
    $ids: [ID!]
    $tagIds: [ID!]
  ) {
    groups(page: $page, limit: $limit, sort: $sort, search: $search, ids: $ids, tagIds: $tagIds) {
      groups {
        id
        name
        description
        createdAt
        updatedAt
        permissions {
          id
          name
          action
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
