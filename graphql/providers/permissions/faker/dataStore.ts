import { faker } from '@faker-js/faker';

import {
  CreatePermissionInput,
  UpdatePermissionInput,
  PermissionSortInput,
  Permission,
} from '@/graphql/generated/types';
import { deleteGroupPermissionsByPermissionId } from '@/graphql/providers/group-permissions/faker/dataStore';
import { deletePermissionTagsByPermissionId } from '@/graphql/providers/permission-tags/faker/dataStore';
import {
  createFakerDataStore,
  EntityConfig,
  generateAuditTimestamps,
  updateAuditTimestamp,
} from '@/lib/providers/faker';

// Generate initial permissions (hardcoded)
const generateInitialPermissions = (): Permission[] => {
  const auditTimestamps = generateAuditTimestamps();
  return [
    {
      id: faker.string.uuid(),
      name: 'Get Policies',
      description: 'Permission to get policies',
      action: 'policies:read',
      ...auditTimestamps,
    },
    {
      id: faker.string.uuid(),
      name: 'Create Policy',
      description: 'Permission to create policies',
      action: 'policies:create',
      ...auditTimestamps,
    },
    {
      id: faker.string.uuid(),
      name: 'Update Policy',
      description: 'Permission to update policies',
      action: 'policies:update',
      ...auditTimestamps,
    },
    {
      id: faker.string.uuid(),
      name: 'Delete Policy',
      description: 'Permission to delete policies',
      action: 'policies:delete',
      ...auditTimestamps,
    },
  ];
};

// Permissions-specific configuration
const permissionsConfig: EntityConfig<Permission, CreatePermissionInput, UpdatePermissionInput> = {
  entityName: 'Permission',
  dataFileName: 'permissions.json',

  // Generate UUID for permission IDs
  generateId: () => faker.string.uuid(),

  // Generate permission entity from input
  generateEntity: (input: CreatePermissionInput, id: string): Permission => {
    const auditTimestamps = generateAuditTimestamps();
    return {
      id,
      name: input.name,
      description: input.description || '',
      action: input.action,
      ...auditTimestamps,
    };
  },

  // Update permission entity
  updateEntity: (entity: Permission, input: UpdatePermissionInput): Permission => {
    const auditTimestamp = updateAuditTimestamp();
    return {
      ...entity,
      name: input.name || entity.name,
      description: input.description || entity.description,
      action: input.action || entity.action,
      ...auditTimestamp,
    };
  },

  // Sortable fields
  sortableFields: ['name', 'createdAt', 'updatedAt'],

  // Validation rules
  validationRules: [
    { field: 'id', unique: true },
    { field: 'name', unique: false, required: true },
    { field: 'action', unique: true, required: true },
  ],

  // Initial data
  initialData: generateInitialPermissions,
};

// Create the permissions data store instance
export const permissionsDataStore = createFakerDataStore(permissionsConfig);

// Export the main functions with the same interface as the original
export const initializeDataStore = () => permissionsDataStore.getEntities();

export const sortPermissions = (
  permissions: Permission[],
  sortConfig?: PermissionSortInput
): Permission[] => {
  if (!sortConfig) return permissions;

  return permissionsDataStore.getEntities({
    field: sortConfig.field,
    order: sortConfig.order,
  });
};
export const getPermissions = (sortConfig?: PermissionSortInput, ids?: string[]): Permission[] => {
  let allPermissions = permissionsDataStore.getEntities(
    sortConfig
      ? {
          field: sortConfig.field,
          order: sortConfig.order,
        }
      : undefined
  );

  // If ids are provided, filter by those IDs
  if (ids && ids.length > 0) {
    allPermissions = allPermissions.filter((permission) => ids.includes(permission.id));
  }

  return allPermissions;
};

export const isPermissionUnique = (permissionId: string): boolean => {
  return permissionsDataStore.entityExists(permissionId);
};

export const createPermission = (input: CreatePermissionInput): Permission => {
  return permissionsDataStore.createEntity(input);
};

export const updatePermission = (
  permissionId: string,
  input: UpdatePermissionInput
): Permission | null => {
  return permissionsDataStore.updateEntity(permissionId, input);
};

export const deletePermission = (permissionId: string): Permission | null => {
  // Clean up related relationships first
  deleteGroupPermissionsByPermissionId(permissionId);
  deletePermissionTagsByPermissionId(permissionId);

  // Then delete the permission
  return permissionsDataStore.deleteEntity(permissionId);
};
