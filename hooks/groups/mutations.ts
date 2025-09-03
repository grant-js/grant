import { gql } from '@apollo/client';

export const CREATE_GROUP = gql`
  mutation CreateGroup($input: CreateGroupInput!) {
    createGroup(input: $input) {
      id
      name
      description
      createdAt
      updatedAt
    }
  }
`;

export const UPDATE_GROUP = gql`
  mutation UpdateGroup($id: ID!, $input: UpdateGroupInput!) {
    updateGroup(id: $id, input: $input) {
      id
      name
      description
      createdAt
      updatedAt
    }
  }
`;

export const DELETE_GROUP = gql`
  mutation DeleteGroup($id: ID!, $scope: Scope!) {
    deleteGroup(id: $id, scope: $scope) {
      id
      name
      description
      createdAt
      updatedAt
    }
  }
`;
