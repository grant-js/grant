import { gql } from '@apollo/client';

export const ADD_PROJECT_ROLE = gql`
  mutation AddProjectRole($input: AddProjectRoleInput!) {
    addProjectRole(input: $input) {
      id
      projectId
      roleId
      createdAt
      updatedAt
    }
  }
`;

export const REMOVE_PROJECT_ROLE = gql`
  mutation RemoveProjectRole($input: RemoveProjectRoleInput!) {
    removeProjectRole(input: $input) {
      id
      projectId
      roleId
      createdAt
      updatedAt
    }
  }
`;
