import { faker } from '@faker-js/faker';

import { AddProjectUserInput, ProjectUser } from '@/graphql/generated/types';
import {
  createFakerDataStore,
  EntityConfig,
  generateAuditTimestamps,
} from '@/lib/providers/faker/genericDataStore';
const generateInitialProjectUsers = (): ProjectUser[] => {
  return [];
};
const projectUserConfig: EntityConfig<ProjectUser, AddProjectUserInput, never> = {
  entityName: 'ProjectUser',
  dataFileName: 'project-users.json',
  generateId: () => faker.string.uuid(),
  generateEntity: (input: AddProjectUserInput, id: string): ProjectUser => {
    const auditTimestamps = generateAuditTimestamps();
    return {
      id,
      projectId: input.projectId,
      userId: input.userId,
      ...auditTimestamps,
    };
  },
  updateEntity: () => {
    throw new Error('ProjectUser entities should be updated through specific methods');
  },
  sortableFields: ['projectId', 'userId', 'createdAt', 'updatedAt'],
  validationRules: [
    { field: 'id', unique: true },
    { field: 'projectId', unique: false, required: true },
    { field: 'userId', unique: false, required: true },
  ],
  initialData: generateInitialProjectUsers,
};
export const projectUsersDataStore = createFakerDataStore(projectUserConfig);
export const getProjectUsersByProjectId = (projectId: string): ProjectUser[] => {
  const projectUsers = projectUsersDataStore
    .getEntities()
    .filter((pu) => pu.projectId === projectId);
  return projectUsers;
};
export const getProjectUsersByUserId = (userId: string): ProjectUser[] => {
  return projectUsersDataStore.getEntities().filter((pu) => pu.userId === userId);
};
export const addProjectUser = (projectId: string, userId: string): ProjectUser => {
  const existingRelationship = projectUsersDataStore
    .getEntities()
    .find((pu) => pu.projectId === projectId && pu.userId === userId);
  if (existingRelationship) {
    return existingRelationship;
  }
  return projectUsersDataStore.createEntity({ projectId, userId });
};
export const deleteProjectUser = (id: string): ProjectUser | null => {
  return projectUsersDataStore.deleteEntity(id);
};
export const deleteProjectUserByProjectAndUser = (
  projectId: string,
  userId: string
): ProjectUser | null => {
  const projectUser = projectUsersDataStore
    .getEntities()
    .find((pu) => pu.projectId === projectId && pu.userId === userId);
  if (!projectUser) {
    return null;
  }
  return projectUsersDataStore.deleteEntity(projectUser.id);
};
export const deleteProjectUsersByProjectId = (projectId: string): ProjectUser[] => {
  const projectUsers = projectUsersDataStore
    .getEntities()
    .filter((pu) => pu.projectId === projectId);
  projectUsers.forEach((pu) => projectUsersDataStore.deleteEntity(pu.id));
  return projectUsers;
};
export const deleteProjectUsersByUserId = (userId: string): ProjectUser[] => {
  const projectUsers = projectUsersDataStore.getEntities().filter((pu) => pu.userId === userId);
  projectUsers.forEach((pu) => projectUsersDataStore.deleteEntity(pu.id));
  return projectUsers;
};
