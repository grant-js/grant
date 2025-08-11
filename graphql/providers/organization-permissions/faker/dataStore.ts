import { faker } from '@faker-js/faker';

import { AddOrganizationPermissionInput, OrganizationPermission } from '@/graphql/generated/types';
import {
  createFakerDataStore,
  EntityConfig,
  generateAuditTimestamps,
} from '@/lib/providers/faker/genericDataStore';

// Generate empty initial data for organization-permission relationships
const generateInitialOrganizationPermissions = (): OrganizationPermission[] => {
  // Return empty array - organization-permission relationships should be created through application logic
  return [];
};

// OrganizationPermission-specific configuration
const organizationPermissionConfig: EntityConfig<
  OrganizationPermission,
  AddOrganizationPermissionInput,
  never
> = {
  entityName: 'OrganizationPermission',
  dataFileName: 'organization-permissions.json',

  // Generate UUID for organization-permission IDs
  generateId: () => faker.string.uuid(),

  // Generate organization-permission entity from input
  generateEntity: (input: AddOrganizationPermissionInput, id: string): OrganizationPermission => {
    const auditTimestamps = generateAuditTimestamps();
    return {
      id,
      organizationId: input.organizationId,
      permissionId: input.permissionId,
      ...auditTimestamps,
    };
  },

  // Update organization-permission entity (not used for this pivot)
  updateEntity: () => {
    throw new Error('OrganizationPermission entities should be updated through specific methods');
  },

  // Sortable fields
  sortableFields: ['organizationId', 'permissionId', 'createdAt', 'updatedAt'],

  // Validation rules
  validationRules: [
    { field: 'id', unique: true },
    { field: 'organizationId', unique: false, required: true },
    { field: 'permissionId', unique: false, required: true },
  ],

  // Initial data
  initialData: generateInitialOrganizationPermissions,
};

// Create the organization-permissions data store instance
export const organizationPermissionsDataStore = createFakerDataStore(organizationPermissionConfig);

// Helper functions for organization-permission operations
export const getOrganizationPermissionsByOrganizationId = (
  organizationId: string
): OrganizationPermission[] => {
  const organizationPermissions = organizationPermissionsDataStore
    .getEntities()
    .filter((op) => op.organizationId === organizationId);
  return organizationPermissions;
};

export const getOrganizationPermissionsByPermissionId = (
  permissionId: string
): OrganizationPermission[] => {
  return organizationPermissionsDataStore
    .getEntities()
    .filter((op) => op.permissionId === permissionId);
};

export const addOrganizationPermission = (
  organizationId: string,
  permissionId: string
): OrganizationPermission => {
  // Check if relationship already exists
  const existingRelationship = organizationPermissionsDataStore
    .getEntities()
    .find((op) => op.organizationId === organizationId && op.permissionId === permissionId);

  if (existingRelationship) {
    return existingRelationship;
  }

  return organizationPermissionsDataStore.createEntity({ organizationId, permissionId });
};

export const deleteOrganizationPermission = (id: string): OrganizationPermission | null => {
  return organizationPermissionsDataStore.deleteEntity(id);
};

export const deleteOrganizationPermissionByOrganizationAndPermission = (
  organizationId: string,
  permissionId: string
): OrganizationPermission | null => {
  const organizationPermission = organizationPermissionsDataStore
    .getEntities()
    .find((op) => op.organizationId === organizationId && op.permissionId === permissionId);

  if (!organizationPermission) {
    return null;
  }

  return organizationPermissionsDataStore.deleteEntity(organizationPermission.id);
};

export const deleteOrganizationPermissionsByOrganizationId = (
  organizationId: string
): OrganizationPermission[] => {
  const organizationPermissions = organizationPermissionsDataStore
    .getEntities()
    .filter((op) => op.organizationId === organizationId);
  organizationPermissions.forEach((op) => organizationPermissionsDataStore.deleteEntity(op.id));
  return organizationPermissions;
};

export const deleteOrganizationPermissionsByPermissionId = (
  permissionId: string
): OrganizationPermission[] => {
  const organizationPermissions = organizationPermissionsDataStore
    .getEntities()
    .filter((op) => op.permissionId === permissionId);
  organizationPermissions.forEach((op) => organizationPermissionsDataStore.deleteEntity(op.id));
  return organizationPermissions;
};
