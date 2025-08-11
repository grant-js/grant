import { gql } from '@apollo/client';

export const ADD_PROJECT_GROUP = gql`
  mutation AddProjectGroup($input: AddProjectGroupInput!) {
    addProjectGroup(input: $input) {
      id
      projectId
      groupId
      createdAt
      updatedAt
    }
  }
`;

export const REMOVE_PROJECT_GROUP = gql`
  mutation RemoveProjectGroup($input: RemoveProjectGroupInput!) {
    removeProjectGroup(input: $input) {
      id
      projectId
      groupId
      createdAt
      updatedAt
    }
  }
`;
