import { faker } from '@faker-js/faker';

import { AddUserTagInput, Scope, Tenant, UserTag } from '@/graphql/generated/types';
import { getTags } from '@/graphql/providers/tags/faker/dataStore';
import { getUsers } from '@/graphql/providers/users/faker/dataStore';
import {
  createFakerDataStore,
  EntityConfig,
  generateAuditTimestamps,
} from '@/lib/providers/faker/genericDataStore';

import { getOrganizationTagsByOrganizationId } from '../../organization-tags/faker/dataStore';
import { getProjectTagsByProjectId } from '../../project-tags/faker/dataStore';

// Generate fake user-tag relationships
const generateFakeUserTags = (count: number = 50): UserTag[] => {
  const users = getUsers();
  const tags = getTags();

  const userTags: UserTag[] = [];

  // Create some random user-tag relationships
  for (let i = 0; i < count; i++) {
    const randomUser = users[Math.floor(Math.random() * users.length)];
    const randomTag = tags[Math.floor(Math.random() * tags.length)];

    // Avoid duplicates
    const exists = userTags.some((ut) => ut.userId === randomUser.id && ut.tagId === randomTag.id);
    if (!exists) {
      const auditTimestamps = generateAuditTimestamps();
      userTags.push({
        id: faker.string.uuid(),
        userId: randomUser.id,
        tagId: randomTag.id,
        ...auditTimestamps,
      });
    }
  }

  return userTags;
};

// UserTag-specific configuration
const userTagConfig: EntityConfig<UserTag, AddUserTagInput, never> = {
  entityName: 'UserTag',
  dataFileName: 'user-tags.json',

  // Generate UUID for user-tag IDs
  generateId: () => faker.string.uuid(),

  // Generate user-tag entity from input
  generateEntity: (input: AddUserTagInput, id: string): UserTag => {
    const auditTimestamps = generateAuditTimestamps();
    return {
      id,
      userId: input.userId,
      tagId: input.tagId,
      ...auditTimestamps,
    };
  },

  // Update user-tag entity (not used for this pivot)
  updateEntity: () => {
    throw new Error('UserTag entities should be updated through specific methods');
  },

  // Sortable fields
  sortableFields: ['userId', 'tagId', 'createdAt', 'updatedAt'],

  // Validation rules
  validationRules: [
    { field: 'id', unique: true },
    { field: 'userId', unique: false, required: true },
    { field: 'tagId', unique: false, required: true },
  ],

  // Initial data
  initialData: generateFakeUserTags,
};

// Create the user-tags data store instance
export const userTagsDataStore = createFakerDataStore(userTagConfig);

// Helper function to get tag IDs based on scope
export const getUserTagIdsByScope = (scope: Scope): string[] => {
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

// Helper functions for user-tag operations
export const getUserTagsByUserId = (scope: Scope, userId: string): UserTag[] => {
  const userTags = userTagsDataStore.getEntities().filter((ut) => ut.userId === userId);

  const scopedTagIds = getUserTagIdsByScope(scope);
  return userTags.filter((ut) => scopedTagIds.includes(ut.tagId));
};

export const getUserTagsByTagId = (tagId: string): UserTag[] => {
  return userTagsDataStore.getEntities().filter((ut) => ut.tagId === tagId);
};

export const getUserTags = (): UserTag[] => {
  return userTagsDataStore.getEntities();
};

export const createUserTag = (userId: string, tagId: string): UserTag => {
  // Check if relationship already exists
  const existing = userTagsDataStore
    .getEntities()
    .find((ut) => ut.userId === userId && ut.tagId === tagId);

  if (existing) {
    throw new Error(`UserTag relationship already exists for user ${userId} and tag ${tagId}`);
  }

  const newUserTag = userTagsDataStore.createEntity({ userId, tagId });
  return newUserTag;
};

export const deleteUserTag = (id: string): UserTag | null => {
  return userTagsDataStore.deleteEntity(id);
};

export const deleteUserTagByUserAndTag = (userId: string, tagId: string): UserTag | null => {
  const userTag = userTagsDataStore
    .getEntities()
    .find((ut) => ut.userId === userId && ut.tagId === tagId);

  if (!userTag) {
    return null;
  }

  return userTagsDataStore.deleteEntity(userTag.id);
};

export const deleteUserTagsByUserId = (userId: string): UserTag[] => {
  const userTags = userTagsDataStore.getEntities().filter((ut) => ut.userId === userId);
  return userTags.map((ut) => userTagsDataStore.deleteEntity(ut.id)).filter(Boolean) as UserTag[];
};

export const deleteUserTagsByTagId = (tagId: string): UserTag[] => {
  const userTags = getUserTagsByTagId(tagId);
  return userTags.map((ut) => userTagsDataStore.deleteEntity(ut.id)).filter(Boolean) as UserTag[];
};
