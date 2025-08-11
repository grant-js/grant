import { gql } from '@apollo/client';

export const CREATE_TAG = gql`
  mutation CreateTag($input: CreateTagInput!) {
    createTag(input: $input) {
      id
      name
      color
      createdAt
      updatedAt
    }
  }
`;

export const UPDATE_TAG = gql`
  mutation UpdateTag($id: ID!, $input: UpdateTagInput!) {
    updateTag(id: $id, input: $input) {
      id
      name
      color
      createdAt
      updatedAt
    }
  }
`;

export const DELETE_TAG = gql`
  mutation DeleteTag($id: ID!) {
    deleteTag(id: $id) {
      id
      name
      color
      createdAt
      updatedAt
    }
  }
`;

export const ADD_USER_TAG = gql`
  mutation AddUserTag($input: AddUserTagInput!) {
    addUserTag(input: $input) {
      id
      userId
      tagId
      createdAt
      updatedAt
    }
  }
`;

export const REMOVE_USER_TAG = gql`
  mutation RemoveUserTag($input: RemoveUserTagInput!) {
    removeUserTag(input: $input) {
      id
      userId
      tagId
      createdAt
      updatedAt
    }
  }
`;

export const ADD_ROLE_TAG = gql`
  mutation AddRoleTag($input: AddRoleTagInput!) {
    addRoleTag(input: $input) {
      id
      roleId
      tagId
      createdAt
      updatedAt
    }
  }
`;

export const REMOVE_ROLE_TAG = gql`
  mutation RemoveRoleTag($input: RemoveRoleTagInput!) {
    removeRoleTag(input: $input) {
      id
      roleId
      tagId
      createdAt
      updatedAt
    }
  }
`;

export const ADD_GROUP_TAG = gql`
  mutation AddGroupTag($input: AddGroupTagInput!) {
    addGroupTag(input: $input) {
      id
      groupId
      tagId
      createdAt
      updatedAt
    }
  }
`;

export const REMOVE_GROUP_TAG = gql`
  mutation RemoveGroupTag($input: RemoveGroupTagInput!) {
    removeGroupTag(input: $input) {
      id
      groupId
      tagId
      createdAt
      updatedAt
    }
  }
`;

export const ADD_PERMISSION_TAG = gql`
  mutation AddPermissionTag($input: AddPermissionTagInput!) {
    addPermissionTag(input: $input) {
      id
      permissionId
      tagId
      createdAt
      updatedAt
    }
  }
`;

export const REMOVE_PERMISSION_TAG = gql`
  mutation RemovePermissionTag($input: RemovePermissionTagInput!) {
    removePermissionTag(input: $input) {
      id
      permissionId
      tagId
      createdAt
      updatedAt
    }
  }
`;
