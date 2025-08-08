import { faker } from '@faker-js/faker';

import { Auditable } from '@/graphql/generated/types';
import { Scope, Tenant } from '@/graphql/generated/types';
import { getOrganizationTagsByOrganizationId } from '@/graphql/providers/organization-tags/faker/dataStore';
import { getProjectTagsByProjectId } from '@/graphql/providers/project-tags/faker/dataStore';
import { getRoles } from '@/graphql/providers/roles/faker/dataStore';
import { getTags } from '@/graphql/providers/tags/faker/dataStore';
import {
  createFakerDataStore,
  EntityConfig,
  generateAuditTimestamps,
} from '@/lib/providers/faker/genericDataStore';

// Type for RoleTag data without the resolved fields
export interface RoleTagData extends Auditable {
  roleId: string;
  tagId: string;
}

// Input type for creating role-tag relationships
export interface CreateRoleTagInput {
  roleId: string;
  tagId: string;
}

// Generate fake role-tag relationships
const generateFakeRoleTags = (count: number = 50): RoleTagData[] => {
  const roles = getRoles();
  const tags = getTags();

  const roleTags: RoleTagData[] = [];

  // Create some random role-tag relationships
  for (let i = 0; i < count; i++) {
    const randomRole = roles[Math.floor(Math.random() * roles.length)];
    const randomTag = tags[Math.floor(Math.random() * tags.length)];

    // Avoid duplicates
    const exists = roleTags.some((rt) => rt.roleId === randomRole.id && rt.tagId === randomTag.id);
    if (!exists) {
      const auditTimestamps = generateAuditTimestamps();
      roleTags.push({
        id: faker.string.uuid(),
        roleId: randomRole.id,
        tagId: randomTag.id,
        ...auditTimestamps,
      });
    }
  }

  return roleTags;
};

// RoleTag-specific configuration
const roleTagConfig: EntityConfig<RoleTagData, CreateRoleTagInput, never> = {
  entityName: 'RoleTag',
  dataFileName: 'role-tags.json',

  // Generate UUID for role-tag IDs
  generateId: () => faker.string.uuid(),

  // Generate role-tag entity from input
  generateEntity: (input: CreateRoleTagInput, id: string): RoleTagData => {
    const auditTimestamps = generateAuditTimestamps();
    return {
      id,
      roleId: input.roleId,
      tagId: input.tagId,
      ...auditTimestamps,
    };
  },

  // Update role-tag entity (not used for this pivot)
  updateEntity: () => {
    throw new Error('RoleTag entities should be updated through specific methods');
  },

  // Sortable fields
  sortableFields: ['roleId', 'tagId', 'createdAt', 'updatedAt'],

  // Validation rules
  validationRules: [
    { field: 'id', unique: true },
    { field: 'roleId', unique: false, required: true },
    { field: 'tagId', unique: false, required: true },
  ],

  // Initial data
  initialData: generateFakeRoleTags,
};

// Create the role-tags data store instance
export const roleTagsDataStore = createFakerDataStore(roleTagConfig);

// Helper function to get tag IDs based on scope
export const getRoleTagIdsByScope = (scope: Scope): string[] => {
  switch (scope.tenant) {
    case Tenant.Project:
      return getProjectTagsByProjectId(scope.id).map((pt) => pt.tagId);
    case Tenant.Organization:
      return getOrganizationTagsByOrganizationId(scope.id).map((ot) => ot.tagId);
    default:
      // For global scope, return all tag IDs
      return getTags().map((t) => t.id);
  }
};

// Helper functions for role-tag operations
export const getRoleTagsByRoleId = (scope: Scope, roleId: string): RoleTagData[] => {
  const roleTags = roleTagsDataStore.getEntities().filter((rt) => rt.roleId === roleId);

  const scopedTagIds = getRoleTagIdsByScope(scope);
  return roleTags.filter((rt) => scopedTagIds.includes(rt.tagId));
};

export const getRoleTagsByTagId = (tagId: string): RoleTagData[] => {
  return roleTagsDataStore.getEntities().filter((rt) => rt.tagId === tagId);
};

export const getRoleTags = (): RoleTagData[] => {
  return roleTagsDataStore.getEntities();
};

export const createRoleTag = (roleId: string, tagId: string): RoleTagData => {
  // Check if relationship already exists
  const existing = roleTagsDataStore
    .getEntities()
    .find((rt) => rt.roleId === roleId && rt.tagId === tagId);

  if (existing) {
    throw new Error(`RoleTag relationship already exists for role ${roleId} and tag ${tagId}`);
  }

  const newRoleTag = roleTagsDataStore.createEntity({ roleId, tagId });
  return newRoleTag;
};

export const deleteRoleTag = (id: string): RoleTagData | null => {
  return roleTagsDataStore.deleteEntity(id);
};

export const deleteRoleTagByRoleAndTag = (roleId: string, tagId: string): RoleTagData | null => {
  const roleTag = roleTagsDataStore
    .getEntities()
    .find((rt) => rt.roleId === roleId && rt.tagId === tagId);

  if (!roleTag) {
    return null;
  }

  return roleTagsDataStore.deleteEntity(roleTag.id);
};

export const deleteRoleTagsByRoleId = (roleId: string): RoleTagData[] => {
  const roleTags = roleTagsDataStore.getEntities().filter((rt) => rt.roleId === roleId);
  return roleTags
    .map((rt) => roleTagsDataStore.deleteEntity(rt.id))
    .filter(Boolean) as RoleTagData[];
};

export const deleteRoleTagsByTagId = (tagId: string): RoleTagData[] => {
  const roleTags = getRoleTagsByTagId(tagId);
  return roleTags
    .map((rt) => roleTagsDataStore.deleteEntity(rt.id))
    .filter(Boolean) as RoleTagData[];
};
