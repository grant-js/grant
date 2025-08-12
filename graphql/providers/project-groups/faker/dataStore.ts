import { faker } from '@faker-js/faker';

import { AddProjectGroupInput, ProjectGroup } from '@/graphql/generated/types';
import {
  createFakerDataStore,
  EntityConfig,
  generateAuditTimestamps,
} from '@/lib/providers/faker/genericDataStore';
const generateInitialProjectGroups = (): ProjectGroup[] => {
  return [];
};
const projectGroupConfig: EntityConfig<ProjectGroup, AddProjectGroupInput, never> = {
  entityName: 'ProjectGroup',
  dataFileName: 'project-groups.json',
  generateId: () => faker.string.uuid(),
  generateEntity: (input: AddProjectGroupInput, id: string): ProjectGroup => {
    const auditTimestamps = generateAuditTimestamps();
    return {
      id,
      projectId: input.projectId,
      groupId: input.groupId,
      ...auditTimestamps,
    };
  },
  updateEntity: () => {
    throw new Error('ProjectGroup entities should be updated through specific methods');
  },
  sortableFields: ['projectId', 'groupId', 'createdAt', 'updatedAt'],
  validationRules: [
    { field: 'id', unique: true },
    { field: 'projectId', unique: false, required: true },
    { field: 'groupId', unique: false, required: true },
  ],
  initialData: generateInitialProjectGroups,
};
export const projectGroupsDataStore = createFakerDataStore(projectGroupConfig);
export const getProjectGroupsByProjectId = (projectId: string): ProjectGroup[] => {
  const projectGroups = projectGroupsDataStore
    .getEntities()
    .filter((pg) => pg.projectId === projectId);
  return projectGroups;
};
export const getProjectGroupsByGroupId = (groupId: string): ProjectGroup[] => {
  return projectGroupsDataStore.getEntities().filter((pg) => pg.groupId === groupId);
};
export const addProjectGroup = (projectId: string, groupId: string): ProjectGroup => {
  const existingRelationship = projectGroupsDataStore
    .getEntities()
    .find((pg) => pg.projectId === projectId && pg.groupId === groupId);
  if (existingRelationship) {
    return existingRelationship;
  }
  return projectGroupsDataStore.createEntity({ projectId, groupId });
};
export const deleteProjectGroup = (id: string): ProjectGroup | null => {
  return projectGroupsDataStore.deleteEntity(id);
};
export const deleteProjectGroupByProjectAndGroup = (
  projectId: string,
  groupId: string
): ProjectGroup | null => {
  const projectGroup = projectGroupsDataStore
    .getEntities()
    .find((pg) => pg.projectId === projectId && pg.groupId === groupId);
  if (!projectGroup) {
    return null;
  }
  return projectGroupsDataStore.deleteEntity(projectGroup.id);
};
export const deleteProjectGroupsByProjectId = (projectId: string): ProjectGroup[] => {
  const projectGroups = projectGroupsDataStore
    .getEntities()
    .filter((pg) => pg.projectId === projectId);
  projectGroups.forEach((pg) => projectGroupsDataStore.deleteEntity(pg.id));
  return projectGroups;
};
export const deleteProjectGroupsByGroupId = (groupId: string): ProjectGroup[] => {
  const projectGroups = projectGroupsDataStore.getEntities().filter((pg) => pg.groupId === groupId);
  projectGroups.forEach((pg) => projectGroupsDataStore.deleteEntity(pg.id));
  return projectGroups;
};
