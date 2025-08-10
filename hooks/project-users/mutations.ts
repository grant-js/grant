import { gql } from '@apollo/client';

export const ADD_PROJECT_USER = gql`
  mutation AddProjectUser($input: AddProjectUserInput!) {
    addProjectUser(input: $input) {
      id
      projectId
      userId
      createdAt
      updatedAt
    }
  }
`;

export const REMOVE_PROJECT_USER = gql`
  mutation RemoveProjectUser($input: RemoveProjectUserInput!) {
    removeProjectUser(input: $input)
  }
`;
