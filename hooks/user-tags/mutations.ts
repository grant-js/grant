import { gql } from '@apollo/client';

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
