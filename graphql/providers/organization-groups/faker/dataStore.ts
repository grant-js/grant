import { faker } from '@faker-js/faker';

import {
  createFakerDataStore,
  EntityConfig,
  generateAuditTimestamps,
} from '@/lib/providers/faker/genericDataStore';

// Type for OrganizationGroup data without the resolved fields
export interface OrganizationGroupData {
  id: string;
  organizationId: string;
  groupId: string;
  createdAt: string;
  updatedAt: string;
}

// Input type for creating organization-group relationships
export interface CreateOrganizationGroupInput {
  organizationId: string;
  groupId: string;
}

// Generate empty initial data for organization-group relationships
const generateInitialOrganizationGroups = (): OrganizationGroupData[] => {
  // Return empty array - organization-group relationships should be created through application logic
  return [];
};

// OrganizationGroup-specific configuration
const organizationGroupConfig: EntityConfig<
  OrganizationGroupData,
  CreateOrganizationGroupInput,
  never
> = {
  entityName: 'OrganizationGroup',
  dataFileName: 'organization-groups.json',

  // Generate UUID for organization-group IDs
  generateId: () => faker.string.uuid(),

  // Generate organization-group entity from input
  generateEntity: (input: CreateOrganizationGroupInput, id: string): OrganizationGroupData => {
    const auditTimestamps = generateAuditTimestamps();
    return {
      id,
      organizationId: input.organizationId,
      groupId: input.groupId,
      ...auditTimestamps,
    };
  },

  // Update organization-group entity (not used for this pivot)
  updateEntity: () => {
    throw new Error('OrganizationGroup entities should be updated through specific methods');
  },

  // Sortable fields
  sortableFields: ['organizationId', 'groupId', 'createdAt', 'updatedAt'],

  // Validation rules
  validationRules: [
    { field: 'id', unique: true },
    { field: 'organizationId', unique: false, required: true },
    { field: 'groupId', unique: false, required: true },
  ],

  // Initial data
  initialData: generateInitialOrganizationGroups,
};

// Create the organization-groups data store instance
export const organizationGroupsDataStore = createFakerDataStore(organizationGroupConfig);

// Helper functions for organization-group operations
export const getOrganizationGroupsByOrganizationId = (
  organizationId: string
): OrganizationGroupData[] => {
  const organizationGroups = organizationGroupsDataStore
    .getEntities()
    .filter((og) => og.organizationId === organizationId);
  return organizationGroups;
};

export const getOrganizationGroupsByGroupId = (groupId: string): OrganizationGroupData[] => {
  return organizationGroupsDataStore.getEntities().filter((og) => og.groupId === groupId);
};

export const addOrganizationGroup = (
  organizationId: string,
  groupId: string
): OrganizationGroupData => {
  // Check if relationship already exists
  const existingRelationship = organizationGroupsDataStore
    .getEntities()
    .find((og) => og.organizationId === organizationId && og.groupId === groupId);

  if (existingRelationship) {
    return existingRelationship;
  }

  return organizationGroupsDataStore.createEntity({ organizationId, groupId });
};

export const deleteOrganizationGroup = (id: string): OrganizationGroupData | null => {
  return organizationGroupsDataStore.deleteEntity(id);
};

export const deleteOrganizationGroupByOrganizationAndGroup = (
  organizationId: string,
  groupId: string
): OrganizationGroupData | null => {
  const organizationGroup = organizationGroupsDataStore
    .getEntities()
    .find((og) => og.organizationId === organizationId && og.groupId === groupId);

  if (!organizationGroup) {
    return null;
  }

  return organizationGroupsDataStore.deleteEntity(organizationGroup.id);
};

export const deleteOrganizationGroupsByOrganizationId = (
  organizationId: string
): OrganizationGroupData[] => {
  const organizationGroups = organizationGroupsDataStore
    .getEntities()
    .filter((og) => og.organizationId === organizationId);
  organizationGroups.forEach((og) => organizationGroupsDataStore.deleteEntity(og.id));
  return organizationGroups;
};

export const deleteOrganizationGroupsByGroupId = (groupId: string): OrganizationGroupData[] => {
  const organizationGroups = organizationGroupsDataStore
    .getEntities()
    .filter((og) => og.groupId === groupId);
  organizationGroups.forEach((og) => organizationGroupsDataStore.deleteEntity(og.id));
  return organizationGroups;
};
