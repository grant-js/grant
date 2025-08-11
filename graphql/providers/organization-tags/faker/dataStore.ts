import { faker } from '@faker-js/faker';

import { AddOrganizationTagInput, OrganizationTag } from '@/graphql/generated/types';
import {
  createFakerDataStore,
  EntityConfig,
  generateAuditTimestamps,
} from '@/lib/providers/faker/genericDataStore';

// Generate empty initial data for organization-tag relationships
const generateInitialOrganizationTags = (): OrganizationTag[] => {
  // Return empty array - organization-tag relationships should be created through application logic
  return [];
};

// OrganizationTag-specific configuration
const organizationTagConfig: EntityConfig<OrganizationTag, AddOrganizationTagInput, never> = {
  entityName: 'OrganizationTag',
  dataFileName: 'organization-tags.json',

  // Generate UUID for organization-tag IDs
  generateId: () => faker.string.uuid(),

  // Generate organization-tag entity from input
  generateEntity: (input: AddOrganizationTagInput, id: string): OrganizationTag => {
    const auditTimestamps = generateAuditTimestamps();
    return {
      id,
      organizationId: input.organizationId,
      tagId: input.tagId,
      ...auditTimestamps,
    };
  },

  // Update organization-tag entity (not used for this pivot)
  updateEntity: () => {
    throw new Error('OrganizationTag entities should be updated through specific methods');
  },

  // Sortable fields
  sortableFields: ['organizationId', 'tagId', 'createdAt', 'updatedAt'],

  // Validation rules
  validationRules: [
    { field: 'id', unique: true },
    { field: 'organizationId', unique: false, required: true },
    { field: 'tagId', unique: false, required: true },
  ],

  // Initial data
  initialData: generateInitialOrganizationTags,
};

// Create the organization-tags data store instance
export const organizationTagsDataStore = createFakerDataStore(organizationTagConfig);

// Helper functions for organization-tag operations
export const getOrganizationTagsByOrganizationId = (organizationId: string): OrganizationTag[] => {
  const organizationTags = organizationTagsDataStore
    .getEntities()
    .filter((ot) => ot.organizationId === organizationId);
  return organizationTags;
};

export const getOrganizationTagsByTagId = (tagId: string): OrganizationTag[] => {
  return organizationTagsDataStore.getEntities().filter((ot) => ot.tagId === tagId);
};

export const addOrganizationTag = (organizationId: string, tagId: string): OrganizationTag => {
  // Check if relationship already exists
  const existingRelationship = organizationTagsDataStore
    .getEntities()
    .find((ot) => ot.organizationId === organizationId && ot.tagId === tagId);

  if (existingRelationship) {
    return existingRelationship;
  }

  return organizationTagsDataStore.createEntity({ organizationId, tagId });
};

export const deleteOrganizationTag = (id: string): OrganizationTag | null => {
  return organizationTagsDataStore.deleteEntity(id);
};

export const deleteOrganizationTagByOrganizationAndTag = (
  organizationId: string,
  tagId: string
): OrganizationTag | null => {
  const organizationTag = organizationTagsDataStore
    .getEntities()
    .find((ot) => ot.organizationId === organizationId && ot.tagId === tagId);

  if (!organizationTag) {
    return null;
  }

  return organizationTagsDataStore.deleteEntity(organizationTag.id);
};

export const deleteOrganizationTagsByOrganizationId = (
  organizationId: string
): OrganizationTag[] => {
  const organizationTags = organizationTagsDataStore
    .getEntities()
    .filter((ot) => ot.organizationId === organizationId);
  organizationTags.forEach((ot) => organizationTagsDataStore.deleteEntity(ot.id));
  return organizationTags;
};

export const deleteOrganizationTagsByTagId = (tagId: string): OrganizationTag[] => {
  const organizationTags = organizationTagsDataStore
    .getEntities()
    .filter((ot) => ot.tagId === tagId);
  organizationTags.forEach((ot) => organizationTagsDataStore.deleteEntity(ot.id));
  return organizationTags;
};
