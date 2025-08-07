import { faker } from '@faker-js/faker';

import {
  createFakerDataStore,
  EntityConfig,
  generateAuditTimestamps,
} from '@/lib/providers/faker/genericDataStore';

// Type for OrganizationPermission data without the resolved fields
export interface OrganizationPermissionData {
  id: string;
  organizationId: string;
  permissionId: string;
  createdAt: string;
  updatedAt: string;
}

// Input type for creating organization-permission relationships
export interface CreateOrganizationPermissionInput {
  organizationId: string;
  permissionId: string;
}

// Generate empty initial data for organization-permission relationships
const generateInitialOrganizationPermissions = (): OrganizationPermissionData[] => {
  // Return empty array - organization-permission relationships should be created through application logic
  return [];
};

// OrganizationPermission-specific configuration
const organizationPermissionConfig: EntityConfig<
  OrganizationPermissionData,
  CreateOrganizationPermissionInput,
  never
> = {
  entityName: 'OrganizationPermission',
  dataFileName: 'organization-permissions.json',

  // Generate UUID for organization-permission IDs
  generateId: () => faker.string.uuid(),

  // Generate organization-permission entity from input
  generateEntity: (
    input: CreateOrganizationPermissionInput,
    id: string
  ): OrganizationPermissionData => {
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
): OrganizationPermissionData[] => {
  const organizationPermissions = organizationPermissionsDataStore
    .getEntities()
    .filter((op) => op.organizationId === organizationId);
  return organizationPermissions;
};

export const getOrganizationPermissionsByPermissionId = (
  permissionId: string
): OrganizationPermissionData[] => {
  return organizationPermissionsDataStore
    .getEntities()
    .filter((op) => op.permissionId === permissionId);
};

export const addOrganizationPermission = (
  organizationId: string,
  permissionId: string
): OrganizationPermissionData => {
  // Check if relationship already exists
  const existingRelationship = organizationPermissionsDataStore
    .getEntities()
    .find((op) => op.organizationId === organizationId && op.permissionId === permissionId);

  if (existingRelationship) {
    return existingRelationship;
  }

  return organizationPermissionsDataStore.createEntity({ organizationId, permissionId });
};

export const deleteOrganizationPermission = (id: string): OrganizationPermissionData | null => {
  return organizationPermissionsDataStore.deleteEntity(id);
};

export const deleteOrganizationPermissionByOrganizationAndPermission = (
  organizationId: string,
  permissionId: string
): OrganizationPermissionData | null => {
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
): OrganizationPermissionData[] => {
  const organizationPermissions = organizationPermissionsDataStore
    .getEntities()
    .filter((op) => op.organizationId === organizationId);
  organizationPermissions.forEach((op) => organizationPermissionsDataStore.deleteEntity(op.id));
  return organizationPermissions;
};

export const deleteOrganizationPermissionsByPermissionId = (
  permissionId: string
): OrganizationPermissionData[] => {
  const organizationPermissions = organizationPermissionsDataStore
    .getEntities()
    .filter((op) => op.permissionId === permissionId);
  organizationPermissions.forEach((op) => organizationPermissionsDataStore.deleteEntity(op.id));
  return organizationPermissions;
};
