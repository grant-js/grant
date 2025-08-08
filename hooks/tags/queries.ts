import { gql } from '@apollo/client';

export const GET_TAGS = gql`
  query GetTags(
    $scope: Scope!
    $page: Int
    $limit: Int
    $sort: TagSortInput
    $search: String
    $ids: [ID!]
  ) {
    tags(scope: $scope, page: $page, limit: $limit, sort: $sort, search: $search, ids: $ids) {
      tags {
        id
        name
        color
        createdAt
        updatedAt
      }
      totalCount
      hasNextPage
    }
  }
`;

export const GET_TAGS_BY_IDS = gql`
  query GetTagsByIds($scope: Scope!, $ids: [ID!]!) {
    tags(scope: $scope, ids: $ids) {
      tags {
        id
        name
        color
        createdAt
        updatedAt
      }
      totalCount
      hasNextPage
    }
  }
`;
