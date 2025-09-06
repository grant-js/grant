import { gql } from '@apollo/client';

export const GET_PROJECTS = gql`
  query GetProjects(
    $organizationId: ID!
    $page: Int
    $limit: Int
    $sort: ProjectSortInput
    $search: String
    $ids: [ID!]
    $tagIds: [ID!]
  ) {
    projects(
      organizationId: $organizationId
      page: $page
      limit: $limit
      sort: $sort
      search: $search
      ids: $ids
      tagIds: $tagIds
    ) {
      projects {
        id
        name
        slug
        description
        createdAt
        updatedAt
        tags {
          id
          name
          color
          isPrimary
        }
      }
      totalCount
      hasNextPage
    }
  }
`;
