import { gql } from '@apollo/client';

export const ADD_PROJECT_TAG = gql`
  mutation AddProjectTag($input: AddProjectTagInput!) {
    addProjectTag(input: $input) {
      id
      projectId
      tagId
      createdAt
      updatedAt
    }
  }
`;

export const REMOVE_PROJECT_TAG = gql`
  mutation RemoveProjectTag($input: RemoveProjectTagInput!) {
    removeProjectTag(input: $input) {
      id
      projectId
      tagId
      createdAt
      updatedAt
    }
  }
`;
