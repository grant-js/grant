import { gql } from '@apollo/client';

export const ADD_ORGANIZATION_USER = gql`
  mutation AddOrganizationUser($input: AddOrganizationUserInput!) {
    addOrganizationUser(input: $input) {
      id
      organizationId
      userId
      createdAt
      updatedAt
    }
  }
`;

export const REMOVE_ORGANIZATION_USER = gql`
  mutation RemoveOrganizationUser($input: RemoveOrganizationUserInput!) {
    removeOrganizationUser(input: $input) {
      id
      organizationId
      userId
      createdAt
      updatedAt
    }
  }
`;
