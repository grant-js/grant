import { gql } from '@apollo/client';

export const ADD_ORGANIZATION_GROUP = gql`
  mutation AddOrganizationGroup($input: AddOrganizationGroupInput!) {
    addOrganizationGroup(input: $input) {
      id
      organizationId
      groupId
      createdAt
      updatedAt
    }
  }
`;

export const REMOVE_ORGANIZATION_GROUP = gql`
  mutation RemoveOrganizationGroup($input: RemoveOrganizationGroupInput!) {
    removeOrganizationGroup(input: $input)
  }
`;
