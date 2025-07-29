import { faker } from '@faker-js/faker';

import { Auditable } from '@/graphql/generated/types';
import { getGroups } from '@/graphql/providers/groups/faker/dataStore';
import { getPermissions } from '@/graphql/providers/permissions/faker/dataStore';
import {
  createFakerDataStore,
  EntityConfig,
  generateAuditTimestamps,
} from '@/lib/providers/faker/genericDataStore';

// Type for GroupPermission data without the resolved fields
export interface GroupPermissionData extends Auditable {
  groupId: string;
  permissionId: string;
}

// Input type for creating group-permission relationships
export interface CreateGroupPermissionInput {
  groupId: string;
  permissionId: string;
}

// Generate fake group-permission relationships
const generateFakeGroupPermissions = (count: number = 100): GroupPermissionData[] => {
  const groups = getGroups();
  const permissions = getPermissions();

  const groupPermissions: GroupPermissionData[] = [];

  // Create some random group-permission relationships
  for (let i = 0; i < count; i++) {
    const randomGroup = groups[Math.floor(Math.random() * groups.length)];
    const randomPermission = permissions[Math.floor(Math.random() * permissions.length)];

    // Avoid duplicates
    const exists = groupPermissions.some(
      (gp) => gp.groupId === randomGroup.id && gp.permissionId === randomPermission.id
    );
    if (!exists) {
      const auditTimestamps = generateAuditTimestamps();
      groupPermissions.push({
        id: faker.string.uuid(),
        groupId: randomGroup.id,
        permissionId: randomPermission.id,
        ...auditTimestamps,
      });
    }
  }

  return groupPermissions;
};

// GroupPermission-specific configuration
const groupPermissionConfig: EntityConfig<GroupPermissionData, CreateGroupPermissionInput, never> =
  {
    entityName: 'GroupPermission',
    dataFileName: 'group-permissions.json',

    // Generate UUID for group-permission IDs
    generateId: () => faker.string.uuid(),

    // Generate group-permission entity from input
    generateEntity: (input: CreateGroupPermissionInput, id: string): GroupPermissionData => {
      const auditTimestamps = generateAuditTimestamps();
      return {
        id,
        groupId: input.groupId,
        permissionId: input.permissionId,
        ...auditTimestamps,
      };
    },

    // Update group-permission entity (not used for this pivot)
    updateEntity: () => {
      throw new Error('GroupPermission entities should be updated through specific methods');
    },

    // Sortable fields
    sortableFields: ['groupId', 'permissionId', 'createdAt', 'updatedAt'],

    // Validation rules
    validationRules: [
      { field: 'id', unique: true },
      { field: 'groupId', unique: false, required: true },
      { field: 'permissionId', unique: false, required: true },
    ],

    // Initial data
    initialData: generateFakeGroupPermissions,
  };

// Create the group-permissions data store instance
export const groupPermissionsDataStore = createFakerDataStore(groupPermissionConfig);

// Helper functions for group-permission operations
export const getGroupPermissionsByGroupId = (groupId: string): GroupPermissionData[] => {
  const groupPermissions = groupPermissionsDataStore
    .getEntities()
    .filter((gp) => gp.groupId === groupId);
  return groupPermissions;
};

export const getGroupPermissionsByPermissionId = (permissionId: string): GroupPermissionData[] => {
  return groupPermissionsDataStore.getEntities().filter((gp) => gp.permissionId === permissionId);
};

export const addGroupPermission = (groupId: string, permissionId: string): GroupPermissionData => {
  // Check if permission already exists
  const existingPermission = groupPermissionsDataStore
    .getEntities()
    .find((gp) => gp.groupId === groupId && gp.permissionId === permissionId);

  if (existingPermission) {
    return existingPermission;
  }

  return groupPermissionsDataStore.createEntity({ groupId, permissionId });
};

export const deleteGroupPermission = (id: string): GroupPermissionData | null => {
  return groupPermissionsDataStore.deleteEntity(id);
};

export const deleteGroupPermissionByGroupAndPermission = (
  groupId: string,
  permissionId: string
): GroupPermissionData | null => {
  const groupPermission = groupPermissionsDataStore
    .getEntities()
    .find((gp) => gp.groupId === groupId && gp.permissionId === permissionId);

  if (!groupPermission) {
    return null;
  }

  return groupPermissionsDataStore.deleteEntity(groupPermission.id);
};

export const deleteGroupPermissionsByGroupId = (groupId: string): GroupPermissionData[] => {
  const groupPermissions = groupPermissionsDataStore
    .getEntities()
    .filter((gp) => gp.groupId === groupId);
  groupPermissions.forEach((gp) => groupPermissionsDataStore.deleteEntity(gp.id));
  return groupPermissions;
};

export const deleteGroupPermissionsByPermissionId = (
  permissionId: string
): GroupPermissionData[] => {
  const groupPermissions = groupPermissionsDataStore
    .getEntities()
    .filter((gp) => gp.permissionId === permissionId);
  groupPermissions.forEach((gp) => groupPermissionsDataStore.deleteEntity(gp.id));
  return groupPermissions;
};
