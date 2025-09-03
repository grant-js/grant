import { gql } from '@apollo/client';

export const CREATE_ROLE = gql`
  mutation CreateRole($input: CreateRoleInput!) {
    createRole(input: $input) {
      id
      name
      description
      createdAt
      updatedAt
    }
  }
`;

export const UPDATE_ROLE = gql`
  mutation UpdateRole($id: ID!, $input: UpdateRoleInput!) {
    updateRole(id: $id, input: $input) {
      id
      name
      description
      createdAt
      updatedAt
    }
  }
`;

export const DELETE_ROLE = gql`
  mutation DeleteRole($id: ID!, $scope: Scope!) {
    deleteRole(id: $id, scope: $scope) {
      id
      name
      description
      createdAt
      updatedAt
    }
  }
`;
