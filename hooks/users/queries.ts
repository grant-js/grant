import { gql } from '@apollo/client';

export const GET_USERS = gql`
  query GetUsers($page: Int!, $limit: Int!, $sort: UserSortInput, $search: String, $tagIds: [ID!]) {
    users(page: $page, limit: $limit, sort: $sort, search: $search, tagIds: $tagIds) {
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
