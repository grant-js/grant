import { gql } from '@apollo/client';

export const CREATE_ORGANIZATION = gql`
  mutation CreateOrganization($input: CreateOrganizationInput!) {
    createOrganization(input: $input) {
      id
      name
      slug
      createdAt
      updatedAt
    }
  }
`;

export const UPDATE_ORGANIZATION = gql`
  mutation UpdateOrganization($id: ID!, $input: UpdateOrganizationInput!) {
    updateOrganization(id: $id, input: $input) {
      id
      name
      slug
      createdAt
      updatedAt
    }
  }
`;

export const DELETE_ORGANIZATION = gql`
  mutation DeleteOrganization($id: ID!) {
    deleteOrganization(id: $id) {
      id
      name
      slug
      createdAt
      updatedAt
    }
  }
`;

export const ADD_ORGANIZATION_ROLE = gql`
  mutation AddOrganizationRole($input: AddOrganizationRoleInput!) {
    addOrganizationRole(input: $input) {
      id
      organizationId
      roleId
      createdAt
      updatedAt
    }
  }
`;

export const REMOVE_ORGANIZATION_ROLE = gql`
  mutation RemoveOrganizationRole($input: RemoveOrganizationRoleInput!) {
    removeOrganizationRole(input: $input) {
      id
      organizationId
      roleId
      createdAt
      updatedAt
    }
  }
`;

export const ADD_ORGANIZATION_TAG = gql`
  mutation AddOrganizationTag($input: AddOrganizationTagInput!) {
    addOrganizationTag(input: $input) {
      id
      organizationId
      tagId
      createdAt
      updatedAt
    }
  }
`;

export const REMOVE_ORGANIZATION_TAG = gql`
  mutation RemoveOrganizationTag($input: RemoveOrganizationTagInput!) {
    removeOrganizationTag(input: $input) {
      id
      organizationId
      tagId
      createdAt
      updatedAt
    }
  }
`;
