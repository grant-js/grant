import { gql } from '@apollo/client';

export const CREATE_USER = gql`
  mutation CreateUser($input: CreateUserInput!) {
    createUser(input: $input) {
      id
      name
      email
      createdAt
      updatedAt
    }
  }
`;

export const UPDATE_USER = gql`
  mutation UpdateUser($id: ID!, $input: UpdateUserInput!) {
    updateUser(id: $id, input: $input) {
      id
      name
      email
      createdAt
      updatedAt
    }
  }
`;

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

export const DELETE_USER = gql`
  mutation DeleteUser($id: ID!) {
    deleteUser(id: $id) {
      id
      name
      email
      createdAt
      updatedAt
    }
  }
`;
