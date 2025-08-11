import { faker } from '@faker-js/faker';

import { AddOrganizationRoleInput, OrganizationRole } from '@/graphql/generated/types';
import {
  createFakerDataStore,
  EntityConfig,
  generateAuditTimestamps,
} from '@/lib/providers/faker/genericDataStore';

// Generate empty initial data for organization-role relationships
const generateInitialOrganizationRoles = (): OrganizationRole[] => {
  // Return empty array - organization-role relationships should be created through application logic
  return [];
};

// OrganizationRole-specific configuration
const organizationRoleConfig: EntityConfig<OrganizationRole, AddOrganizationRoleInput, never> = {
  entityName: 'OrganizationRole',
  dataFileName: 'organization-roles.json',

  // Generate UUID for organization-role IDs
  generateId: () => faker.string.uuid(),

  // Generate organization-role entity from input
  generateEntity: (input: AddOrganizationRoleInput, id: string): OrganizationRole => {
    const auditTimestamps = generateAuditTimestamps();
    return {
      id,
      organizationId: input.organizationId,
      roleId: input.roleId,
      ...auditTimestamps,
    };
  },

  // Update organization-role entity (not used for this pivot)
  updateEntity: () => {
    throw new Error('OrganizationRole entities should be updated through specific methods');
  },

  // Sortable fields
  sortableFields: ['organizationId', 'roleId', 'createdAt', 'updatedAt'],

  // Validation rules
  validationRules: [
    { field: 'id', unique: true },
    { field: 'organizationId', unique: false, required: true },
    { field: 'roleId', unique: false, required: true },
  ],

  // Initial data
  initialData: generateInitialOrganizationRoles,
};

// Create the organization-roles data store instance
export const organizationRolesDataStore = createFakerDataStore(organizationRoleConfig);

// Helper functions for organization-role operations
export const getOrganizationRolesByOrganizationId = (
  organizationId: string
): OrganizationRole[] => {
  const organizationRoles = organizationRolesDataStore
    .getEntities()
    .filter((or) => or.organizationId === organizationId);
  return organizationRoles;
};

export const getOrganizationRolesByRoleId = (roleId: string): OrganizationRole[] => {
  return organizationRolesDataStore.getEntities().filter((or) => or.roleId === roleId);
};

export const addOrganizationRole = (organizationId: string, roleId: string): OrganizationRole => {
  // Check if relationship already exists
  const existingRelationship = organizationRolesDataStore
    .getEntities()
    .find((or) => or.organizationId === organizationId && or.roleId === roleId);

  if (existingRelationship) {
    return existingRelationship;
  }

  return organizationRolesDataStore.createEntity({ organizationId, roleId });
};

export const deleteOrganizationRole = (id: string): OrganizationRole | null => {
  return organizationRolesDataStore.deleteEntity(id);
};

export const deleteOrganizationRoleByOrganizationAndRole = (
  organizationId: string,
  roleId: string
): OrganizationRole | null => {
  const organizationRole = organizationRolesDataStore
    .getEntities()
    .find((or) => or.organizationId === organizationId && or.roleId === roleId);

  if (!organizationRole) {
    return null;
  }

  return organizationRolesDataStore.deleteEntity(organizationRole.id);
};

export const deleteOrganizationRolesByOrganizationId = (
  organizationId: string
): OrganizationRole[] => {
  const organizationRoles = organizationRolesDataStore
    .getEntities()
    .filter((or) => or.organizationId === organizationId);
  organizationRoles.forEach((or) => organizationRolesDataStore.deleteEntity(or.id));
  return organizationRoles;
};

export const deleteOrganizationRolesByRoleId = (roleId: string): OrganizationRole[] => {
  const organizationRoles = organizationRolesDataStore
    .getEntities()
    .filter((or) => or.roleId === roleId);
  organizationRoles.forEach((or) => organizationRolesDataStore.deleteEntity(or.id));
  return organizationRoles;
};
