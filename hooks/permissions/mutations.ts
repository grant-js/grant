import { gql } from '@apollo/client';

export const CREATE_PERMISSION = gql`
  mutation CreatePermission($input: CreatePermissionInput!) {
    createPermission(input: $input) {
      id
      name
      action
      description
      tags {
        id
        name
        color
      }
      createdAt
      updatedAt
    }
  }
`;

export const UPDATE_PERMISSION = gql`
  mutation UpdatePermission($id: ID!, $input: UpdatePermissionInput!) {
    updatePermission(id: $id, input: $input) {
      id
      name
      action
      description
      tags {
        id
        name
        color
      }
      createdAt
      updatedAt
    }
  }
`;

export const DELETE_PERMISSION = gql`
  mutation DeletePermission($id: ID!) {
    deletePermission(id: $id) {
      id
      name
      action
      description
      createdAt
      updatedAt
    }
  }
`;
