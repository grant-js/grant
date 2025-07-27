import { gql } from '@apollo/client';

export const CREATE_GROUP = gql`
  mutation CreateGroup($input: CreateGroupInput!) {
    createGroup(input: $input) {
      id
      name
      description
    }
  }
`;

export const UPDATE_GROUP = gql`
  mutation UpdateGroup($id: ID!, $input: UpdateGroupInput!) {
    updateGroup(id: $id, input: $input) {
      id
      name
      description
    }
  }
`;

export const DELETE_GROUP = gql`
  mutation DeleteGroup($id: ID!) {
    deleteGroup(id: $id)
  }
`;

export const ADD_GROUP_PERMISSION = gql`
  mutation AddGroupPermission($input: AddGroupPermissionInput!) {
    addGroupPermission(input: $input) {
      id
      groupId
      permissionId
    }
  }
`;

export const REMOVE_GROUP_PERMISSION = gql`
  mutation RemoveGroupPermission($input: RemoveGroupPermissionInput!) {
    removeGroupPermission(input: $input)
  }
`;
