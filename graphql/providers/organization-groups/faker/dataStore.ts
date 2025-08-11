import { faker } from '@faker-js/faker';

import { AddOrganizationGroupInput, OrganizationGroup } from '@/graphql/generated/types';
import {
  createFakerDataStore,
  EntityConfig,
  generateAuditTimestamps,
} from '@/lib/providers/faker/genericDataStore';

// Generate empty initial data for organization-group relationships
const generateInitialOrganizationGroups = (): OrganizationGroup[] => {
  // Return empty array - organization-group relationships should be created through application logic
  return [];
};

// OrganizationGroup-specific configuration
const organizationGroupConfig: EntityConfig<OrganizationGroup, AddOrganizationGroupInput, never> = {
  entityName: 'OrganizationGroup',
  dataFileName: 'organization-groups.json',

  // Generate UUID for organization-group IDs
  generateId: () => faker.string.uuid(),

  // Generate organization-group entity from input
  generateEntity: (input: AddOrganizationGroupInput, id: string): OrganizationGroup => {
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
): OrganizationGroup[] => {
  const organizationGroups = organizationGroupsDataStore
    .getEntities()
    .filter((og) => og.organizationId === organizationId);
  return organizationGroups;
};

export const getOrganizationGroupsByGroupId = (groupId: string): OrganizationGroup[] => {
  return organizationGroupsDataStore.getEntities().filter((og) => og.groupId === groupId);
};

export const addOrganizationGroup = (
  organizationId: string,
  groupId: string
): OrganizationGroup => {
  // Check if relationship already exists
  const existingRelationship = organizationGroupsDataStore
    .getEntities()
    .find((og) => og.organizationId === organizationId && og.groupId === groupId);

  if (existingRelationship) {
    return existingRelationship;
  }

  return organizationGroupsDataStore.createEntity({ organizationId, groupId });
};

export const deleteOrganizationGroup = (id: string): OrganizationGroup | null => {
  return organizationGroupsDataStore.deleteEntity(id);
};

export const deleteOrganizationGroupByOrganizationAndGroup = (
  organizationId: string,
  groupId: string
): OrganizationGroup | null => {
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
): OrganizationGroup[] => {
  const organizationGroups = organizationGroupsDataStore
    .getEntities()
    .filter((og) => og.organizationId === organizationId);
  organizationGroups.forEach((og) => organizationGroupsDataStore.deleteEntity(og.id));
  return organizationGroups;
};

export const deleteOrganizationGroupsByGroupId = (groupId: string): OrganizationGroup[] => {
  const organizationGroups = organizationGroupsDataStore
    .getEntities()
    .filter((og) => og.groupId === groupId);
  organizationGroups.forEach((og) => organizationGroupsDataStore.deleteEntity(og.id));
  return organizationGroups;
};
