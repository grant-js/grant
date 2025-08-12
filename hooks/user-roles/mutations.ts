import { gql } from '@apollo/client';

export const ADD_USER_ROLE = gql`
  mutation AddUserRole($input: AddUserRoleInput!) {
    addUserRole(input: $input) {
      id
      userId
      roleId
      createdAt
      updatedAt
    }
  }
`;

export const REMOVE_USER_ROLE = gql`
  mutation RemoveUserRole($input: RemoveUserRoleInput!) {
    removeUserRole(input: $input) {
      id
      userId
      roleId
      createdAt
      updatedAt
    }
  }
`;
