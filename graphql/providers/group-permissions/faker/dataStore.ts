import { faker } from '@faker-js/faker';

import { AddGroupPermissionInput, GroupPermission, Scope, Tenant } from '@/graphql/generated/types';
import { getGroups } from '@/graphql/providers/groups/faker/dataStore';
import { getPermissions } from '@/graphql/providers/permissions/faker/dataStore';
import {
  createFakerDataStore,
  EntityConfig,
  generateAuditTimestamps,
} from '@/lib/providers/faker/genericDataStore';

import { getOrganizationPermissionsByOrganizationId } from '../../organization-permissions/faker/dataStore';
import { getProjectPermissionsByProjectId } from '../../project-permissions/faker/dataStore';

// Generate fake group-permission relationships
const generateFakeGroupPermissions = (count: number = 100): GroupPermission[] => {
  const groups = getGroups();
  const permissions = getPermissions();

  const groupPermissions: GroupPermission[] = [];

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
const groupPermissionConfig: EntityConfig<GroupPermission, AddGroupPermissionInput, never> = {
  entityName: 'GroupPermission',
  dataFileName: 'group-permissions.json',

  // Generate UUID for group-permission IDs
  generateId: () => faker.string.uuid(),

  // Generate group-permission entity from input
  generateEntity: (input: AddGroupPermissionInput, id: string): GroupPermission => {
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

// Helper function to get permission IDs based on scope
export const getGroupPermissionIdsByScope = (scope: Scope): string[] => {
  switch (scope.tenant) {
    case Tenant.Project:
      return getProjectPermissionsByProjectId(scope.id).map((pp) => pp.permissionId);
    case Tenant.Organization:
      return getOrganizationPermissionsByOrganizationId(scope.id).map((op) => op.permissionId);
    default:
      // For global scope, return all permission IDs
      return getPermissions().map((p) => p.id);
  }
};

// Helper functions for group-permission operations
export const getGroupPermissionsByGroupId = (scope: Scope, groupId: string): GroupPermission[] => {
  const groupPermissions = groupPermissionsDataStore
    .getEntities()
    .filter((gp) => gp.groupId === groupId);

  const scopedPermissionIds = getGroupPermissionIdsByScope(scope);
  return groupPermissions.filter((gp) => scopedPermissionIds.includes(gp.permissionId));
};

export const addGroupPermission = (groupId: string, permissionId: string): GroupPermission => {
  // Check if permission already exists
  const existingPermission = groupPermissionsDataStore
    .getEntities()
    .find((gp) => gp.groupId === groupId && gp.permissionId === permissionId);

  if (existingPermission) {
    return existingPermission;
  }

  return groupPermissionsDataStore.createEntity({ groupId, permissionId });
};

export const deleteGroupPermission = (id: string): GroupPermission | null => {
  return groupPermissionsDataStore.deleteEntity(id);
};

export const deleteGroupPermissionByGroupAndPermission = (
  groupId: string,
  permissionId: string
): GroupPermission | null => {
  const groupPermission = groupPermissionsDataStore
    .getEntities()
    .find((gp) => gp.groupId === groupId && gp.permissionId === permissionId);

  if (!groupPermission) {
    return null;
  }

  return groupPermissionsDataStore.deleteEntity(groupPermission.id);
};

export const deleteGroupPermissionsByGroupId = (groupId: string): GroupPermission[] => {
  const groupPermissions = groupPermissionsDataStore
    .getEntities()
    .filter((gp) => gp.groupId === groupId);
  groupPermissions.forEach((gp) => groupPermissionsDataStore.deleteEntity(gp.id));
  return groupPermissions;
};

export const deleteGroupPermissionsByPermissionId = (permissionId: string): GroupPermission[] => {
  const groupPermissions = groupPermissionsDataStore
    .getEntities()
    .filter((gp) => gp.permissionId === permissionId);
  groupPermissions.forEach((gp) => groupPermissionsDataStore.deleteEntity(gp.id));
  return groupPermissions;
};
