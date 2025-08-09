import { gql } from '@apollo/client';

export const ADD_ORGANIZATION_PROJECT = gql`
  mutation AddOrganizationProject($input: AddOrganizationProjectInput!) {
    addOrganizationProject(input: $input) {
      id
      organizationId
      projectId
      createdAt
      updatedAt
      organization {
        id
        name
        slug
      }
      project {
        id
        name
        slug
        description
      }
    }
  }
`;

export const REMOVE_ORGANIZATION_PROJECT = gql`
  mutation RemoveOrganizationProject($input: RemoveOrganizationProjectInput!) {
    removeOrganizationProject(input: $input) {
      id
      organizationId
      projectId
      createdAt
      updatedAt
    }
  }
`;
