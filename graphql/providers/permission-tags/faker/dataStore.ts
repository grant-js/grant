import { faker } from '@faker-js/faker';

import { Auditable } from '@/graphql/generated/types';
import { getPermissions } from '@/graphql/providers/permissions/faker/dataStore';
import { getTags } from '@/graphql/providers/tags/faker/dataStore';
import {
  createFakerDataStore,
  EntityConfig,
  generateAuditTimestamps,
} from '@/lib/providers/faker/genericDataStore';

// Type for PermissionTag data without the resolved fields
export interface PermissionTagData extends Auditable {
  permissionId: string;
  tagId: string;
}

// Input type for creating permission-tag relationships
export interface CreatePermissionTagInput {
  permissionId: string;
  tagId: string;
}

// Generate fake permission-tag relationships
const generateFakePermissionTags = (count: number = 50): PermissionTagData[] => {
  const permissions = getPermissions();
  const tags = getTags();

  const permissionTags: PermissionTagData[] = [];

  // Create some random permission-tag relationships
  for (let i = 0; i < count; i++) {
    const randomPermission = permissions[Math.floor(Math.random() * permissions.length)];
    const randomTag = tags[Math.floor(Math.random() * tags.length)];

    // Avoid duplicates
    const exists = permissionTags.some(
      (pt) => pt.permissionId === randomPermission.id && pt.tagId === randomTag.id
    );
    if (!exists) {
      const auditTimestamps = generateAuditTimestamps();
      permissionTags.push({
        id: faker.string.uuid(),
        permissionId: randomPermission.id,
        tagId: randomTag.id,
        ...auditTimestamps,
      });
    }
  }

  return permissionTags;
};

// PermissionTag-specific configuration
const permissionTagConfig: EntityConfig<PermissionTagData, CreatePermissionTagInput, never> = {
  entityName: 'PermissionTag',
  dataFileName: 'permission-tags.json',

  // Generate UUID for permission-tag IDs
  generateId: () => faker.string.uuid(),

  // Generate permission-tag entity from input
  generateEntity: (input: CreatePermissionTagInput, id: string): PermissionTagData => {
    const auditTimestamps = generateAuditTimestamps();
    return {
      id,
      permissionId: input.permissionId,
      tagId: input.tagId,
      ...auditTimestamps,
    };
  },

  // Update permission-tag entity (not used for this pivot)
  updateEntity: () => {
    throw new Error('PermissionTag entities should be updated through specific methods');
  },

  // Sortable fields
  sortableFields: ['permissionId', 'tagId', 'createdAt', 'updatedAt'],

  // Validation rules
  validationRules: [
    { field: 'id', unique: true },
    { field: 'permissionId', unique: false, required: true },
    { field: 'tagId', unique: false, required: true },
  ],

  // Initial data
  initialData: generateFakePermissionTags,
};

// Create the permission-tags data store instance
export const permissionTagsDataStore = createFakerDataStore(permissionTagConfig);

// Helper functions for permission-tag operations
export const getPermissionTagsByPermissionId = (permissionId: string): PermissionTagData[] => {
  return permissionTagsDataStore.getEntities().filter((pt) => pt.permissionId === permissionId);
};

export const getPermissionTagsByTagId = (tagId: string): PermissionTagData[] => {
  return permissionTagsDataStore.getEntities().filter((pt) => pt.tagId === tagId);
};

export const getPermissionTags = (): PermissionTagData[] => {
  return permissionTagsDataStore.getEntities();
};

export const createPermissionTag = (permissionId: string, tagId: string): PermissionTagData => {
  // Check if relationship already exists
  const existing = permissionTagsDataStore
    .getEntities()
    .find((pt) => pt.permissionId === permissionId && pt.tagId === tagId);

  if (existing) {
    throw new Error(
      `PermissionTag relationship already exists for permission ${permissionId} and tag ${tagId}`
    );
  }

  const newPermissionTag = permissionTagsDataStore.createEntity({ permissionId, tagId });
  return newPermissionTag;
};

export const deletePermissionTag = (id: string): PermissionTagData | null => {
  return permissionTagsDataStore.deleteEntity(id);
};

export const deletePermissionTagByPermissionAndTag = (
  permissionId: string,
  tagId: string
): PermissionTagData | null => {
  const permissionTag = permissionTagsDataStore
    .getEntities()
    .find((pt) => pt.permissionId === permissionId && pt.tagId === tagId);

  if (!permissionTag) {
    return null;
  }

  return permissionTagsDataStore.deleteEntity(permissionTag.id);
};

export const deletePermissionTagsByPermissionId = (permissionId: string): PermissionTagData[] => {
  const permissionTags = getPermissionTagsByPermissionId(permissionId);
  return permissionTags
    .map((pt) => permissionTagsDataStore.deleteEntity(pt.id))
    .filter(Boolean) as PermissionTagData[];
};

export const deletePermissionTagsByTagId = (tagId: string): PermissionTagData[] => {
  const permissionTags = getPermissionTagsByTagId(tagId);
  return permissionTags
    .map((pt) => permissionTagsDataStore.deleteEntity(pt.id))
    .filter(Boolean) as PermissionTagData[];
};
