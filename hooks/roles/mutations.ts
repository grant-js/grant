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
  mutation DeleteRole($id: ID!) {
    deleteRole(id: $id) {
      id
      name
      description
      createdAt
      updatedAt
    }
  }
`;

export const ADD_ROLE_GROUP = gql`
  mutation AddRoleGroup($input: AddRoleGroupInput!) {
    addRoleGroup(input: $input) {
      id
      groupId
      roleId
      createdAt
      updatedAt
    }
  }
`;

export const REMOVE_ROLE_GROUP = gql`
  mutation RemoveRoleGroup($input: RemoveRoleGroupInput!) {
    removeRoleGroup(input: $input) {
      id
      groupId
      roleId
      createdAt
      updatedAt
    }
  }
`;
