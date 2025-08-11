import { gql } from '@apollo/client';

export const CREATE_PROJECT = gql`
  mutation CreateProject($input: CreateProjectInput!) {
    createProject(input: $input) {
      id
      name
      slug
      description
      createdAt
      updatedAt
    }
  }
`;

export const UPDATE_PROJECT = gql`
  mutation UpdateProject($id: ID!, $input: UpdateProjectInput!) {
    updateProject(id: $id, input: $input) {
      id
      name
      slug
      description
      createdAt
      updatedAt
    }
  }
`;

export const DELETE_PROJECT = gql`
  mutation DeleteProject($id: ID!) {
    deleteProject(id: $id)
  }
`;

export const ADD_PROJECT_ROLE = gql`
  mutation AddProjectRole($input: AddProjectRoleInput!) {
    addProjectRole(input: $input) {
      id
      projectId
      roleId
      createdAt
      updatedAt
    }
  }
`;

export const REMOVE_PROJECT_ROLE = gql`
  mutation RemoveProjectRole($input: RemoveProjectRoleInput!) {
    removeProjectRole(input: $input)
  }
`;

export const ADD_PROJECT_TAG = gql`
  mutation AddProjectTag($input: AddProjectTagInput!) {
    addProjectTag(input: $input) {
      id
      projectId
      tagId
      createdAt
      updatedAt
    }
  }
`;

export const REMOVE_PROJECT_TAG = gql`
  mutation RemoveProjectTag($input: RemoveProjectTagInput!) {
    removeProjectTag(input: $input)
  }
`;
