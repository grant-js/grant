import { faker } from '@faker-js/faker';

import { AddOrganizationUserInput, OrganizationUser } from '@/graphql/generated/types';
import {
  createFakerDataStore,
  EntityConfig,
  generateAuditTimestamps,
} from '@/lib/providers/faker/genericDataStore';

// Generate empty initial data for organization-user relationships
const generateInitialOrganizationUsers = (): OrganizationUser[] => {
  // Return empty array - organization-user relationships should be created through application logic
  return [];
};

// OrganizationUser-specific configuration
const organizationUserConfig: EntityConfig<OrganizationUser, AddOrganizationUserInput, never> = {
  entityName: 'OrganizationUser',
  dataFileName: 'organization-users.json',

  // Generate UUID for organization-user IDs
  generateId: () => faker.string.uuid(),

  // Generate organization-user entity from input
  generateEntity: (input: AddOrganizationUserInput, id: string): OrganizationUser => {
    const auditTimestamps = generateAuditTimestamps();
    return {
      id,
      organizationId: input.organizationId,
      userId: input.userId,
      ...auditTimestamps,
    };
  },

  // Update organization-user entity (not used for this pivot)
  updateEntity: () => {
    throw new Error('OrganizationUser entities should be updated through specific methods');
  },

  // Sortable fields
  sortableFields: ['organizationId', 'userId', 'createdAt', 'updatedAt'],

  // Validation rules
  validationRules: [
    { field: 'id', unique: true },
    { field: 'organizationId', unique: false, required: true },
    { field: 'userId', unique: false, required: true },
  ],

  // Initial data
  initialData: generateInitialOrganizationUsers,
};

// Create the organization-users data store instance
export const organizationUsersDataStore = createFakerDataStore(organizationUserConfig);

// Helper functions for organization-user operations
export const getOrganizationUsersByOrganizationId = (
  organizationId: string
): OrganizationUser[] => {
  const organizationUsers = organizationUsersDataStore
    .getEntities()
    .filter((ou) => ou.organizationId === organizationId);
  return organizationUsers;
};

export const getOrganizationUsersByUserId = (userId: string): OrganizationUser[] => {
  return organizationUsersDataStore.getEntities().filter((ou) => ou.userId === userId);
};

export const addOrganizationUser = (organizationId: string, userId: string): OrganizationUser => {
  // Check if relationship already exists
  const existingRelationship = organizationUsersDataStore
    .getEntities()
    .find((ou) => ou.organizationId === organizationId && ou.userId === userId);

  if (existingRelationship) {
    return existingRelationship;
  }

  return organizationUsersDataStore.createEntity({ organizationId, userId });
};

export const deleteOrganizationUser = (id: string): OrganizationUser | null => {
  return organizationUsersDataStore.deleteEntity(id);
};

export const deleteOrganizationUserByOrganizationAndUser = (
  organizationId: string,
  userId: string
): OrganizationUser | null => {
  const organizationUser = organizationUsersDataStore
    .getEntities()
    .find((ou) => ou.organizationId === organizationId && ou.userId === userId);

  if (!organizationUser) {
    return null;
  }

  return organizationUsersDataStore.deleteEntity(organizationUser.id);
};

export const deleteOrganizationUsersByOrganizationId = (
  organizationId: string
): OrganizationUser[] => {
  const organizationUsers = organizationUsersDataStore
    .getEntities()
    .filter((ou) => ou.organizationId === organizationId);
  organizationUsers.forEach((ou) => organizationUsersDataStore.deleteEntity(ou.id));
  return organizationUsers;
};

export const deleteOrganizationUsersByUserId = (userId: string): OrganizationUser[] => {
  const organizationUsers = organizationUsersDataStore
    .getEntities()
    .filter((ou) => ou.userId === userId);
  organizationUsers.forEach((ou) => organizationUsersDataStore.deleteEntity(ou.id));
  return organizationUsers;
};
