import { faker } from '@faker-js/faker';

import { AddProjectGroupInput, ProjectGroup } from '@/graphql/generated/types';
import {
  createFakerDataStore,
  EntityConfig,
  generateAuditTimestamps,
} from '@/lib/providers/faker/genericDataStore';

// Generate empty initial data for project-group relationships
const generateInitialProjectGroups = (): ProjectGroup[] => {
  // Return empty array - project-group relationships should be created through application logic
  return [];
};

// ProjectGroup-specific configuration
const projectGroupConfig: EntityConfig<ProjectGroup, AddProjectGroupInput, never> = {
  entityName: 'ProjectGroup',
  dataFileName: 'project-groups.json',

  // Generate UUID for project-group IDs
  generateId: () => faker.string.uuid(),

  // Generate project-group entity from input
  generateEntity: (input: AddProjectGroupInput, id: string): ProjectGroup => {
    const auditTimestamps = generateAuditTimestamps();
    return {
      id,
      projectId: input.projectId,
      groupId: input.groupId,
      ...auditTimestamps,
    };
  },

  // Update project-group entity (not used for this pivot)
  updateEntity: () => {
    throw new Error('ProjectGroup entities should be updated through specific methods');
  },

  // Sortable fields
  sortableFields: ['projectId', 'groupId', 'createdAt', 'updatedAt'],

  // Validation rules
  validationRules: [
    { field: 'id', unique: true },
    { field: 'projectId', unique: false, required: true },
    { field: 'groupId', unique: false, required: true },
  ],

  // Initial data
  initialData: generateInitialProjectGroups,
};

// Create the project-groups data store instance
export const projectGroupsDataStore = createFakerDataStore(projectGroupConfig);

// Helper functions for project-group operations
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
  // Check if relationship already exists
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
