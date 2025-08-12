import { faker } from '@faker-js/faker';

import { AddProjectRoleInput, ProjectRole } from '@/graphql/generated/types';
import {
  createFakerDataStore,
  EntityConfig,
  generateAuditTimestamps,
} from '@/lib/providers/faker/genericDataStore';
const generateInitialProjectRoles = (): ProjectRole[] => {
  return [];
};
const projectRoleConfig: EntityConfig<ProjectRole, AddProjectRoleInput, never> = {
  entityName: 'ProjectRole',
  dataFileName: 'project-roles.json',
  generateId: () => faker.string.uuid(),
  generateEntity: (input: AddProjectRoleInput, id: string): ProjectRole => {
    const auditTimestamps = generateAuditTimestamps();
    return {
      id,
      projectId: input.projectId,
      roleId: input.roleId,
      ...auditTimestamps,
    };
  },
  updateEntity: () => {
    throw new Error('ProjectRole entities should be updated through specific methods');
  },
  sortableFields: ['projectId', 'roleId', 'createdAt', 'updatedAt'],
  validationRules: [
    { field: 'id', unique: true },
    { field: 'projectId', unique: false, required: true },
    { field: 'roleId', unique: false, required: true },
  ],
  initialData: generateInitialProjectRoles,
};
export const projectRolesDataStore = createFakerDataStore(projectRoleConfig);
export const getProjectRolesByProjectId = (projectId: string): ProjectRole[] => {
  const projectRoles = projectRolesDataStore
    .getEntities()
    .filter((pr) => pr.projectId === projectId);
  return projectRoles;
};
export const getProjectRolesByRoleId = (roleId: string): ProjectRole[] => {
  return projectRolesDataStore.getEntities().filter((pr) => pr.roleId === roleId);
};
export const addProjectRole = (projectId: string, roleId: string): ProjectRole => {
  const existingRelationship = projectRolesDataStore
    .getEntities()
    .find((pr) => pr.projectId === projectId && pr.roleId === roleId);
  if (existingRelationship) {
    return existingRelationship;
  }
  return projectRolesDataStore.createEntity({ projectId, roleId });
};
export const deleteProjectRole = (id: string): ProjectRole | null => {
  return projectRolesDataStore.deleteEntity(id);
};
export const deleteProjectRoleByProjectAndRole = (
  projectId: string,
  roleId: string
): ProjectRole | null => {
  const projectRole = projectRolesDataStore
    .getEntities()
    .find((pr) => pr.projectId === projectId && pr.roleId === roleId);
  if (!projectRole) {
    return null;
  }
  return projectRolesDataStore.deleteEntity(projectRole.id);
};
export const deleteProjectRolesByProjectId = (projectId: string): ProjectRole[] => {
  const projectRoles = projectRolesDataStore
    .getEntities()
    .filter((pr) => pr.projectId === projectId);
  projectRoles.forEach((pr) => projectRolesDataStore.deleteEntity(pr.id));
  return projectRoles;
};
export const deleteProjectRolesByRoleId = (roleId: string): ProjectRole[] => {
  const projectRoles = projectRolesDataStore.getEntities().filter((pr) => pr.roleId === roleId);
  projectRoles.forEach((pr) => projectRolesDataStore.deleteEntity(pr.id));
  return projectRoles;
};
