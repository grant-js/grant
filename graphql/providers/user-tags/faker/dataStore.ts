import { faker } from '@faker-js/faker';
import {
  createFakerDataStore,
  EntityConfig,
  generateAuditTimestamps,
  updateAuditTimestamp,
} from '@/lib/providers/faker/genericDataStore';
import { getUsers } from '@/graphql/providers/users/faker/dataStore';
import { getTags } from '@/graphql/providers/tags/faker/dataStore';
import { Auditable } from '@/graphql/generated/types';

// Type for UserTag data without the resolved fields
export interface UserTagData extends Auditable {
  userId: string;
  tagId: string;
}

// Input type for creating user-tag relationships
export interface CreateUserTagInput {
  userId: string;
  tagId: string;
}

// Generate fake user-tag relationships
const generateFakeUserTags = (count: number = 50): UserTagData[] => {
  const users = getUsers();
  const tags = getTags();

  const userTags: UserTagData[] = [];

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
const userTagConfig: EntityConfig<UserTagData, CreateUserTagInput, never> = {
  entityName: 'UserTag',
  dataFileName: 'user-tags.json',

  // Generate UUID for user-tag IDs
  generateId: () => faker.string.uuid(),

  // Generate user-tag entity from input
  generateEntity: (input: CreateUserTagInput, id: string): UserTagData => {
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

// Helper functions for user-tag operations
export const getUserTagsByUserId = (userId: string): UserTagData[] => {
  return userTagsDataStore.getEntities().filter((ut) => ut.userId === userId);
};

export const getUserTagsByTagId = (tagId: string): UserTagData[] => {
  return userTagsDataStore.getEntities().filter((ut) => ut.tagId === tagId);
};

export const getUserTags = (): UserTagData[] => {
  return userTagsDataStore.getEntities();
};

export const createUserTag = (userId: string, tagId: string): UserTagData => {
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

export const deleteUserTag = (id: string): UserTagData | null => {
  return userTagsDataStore.deleteEntity(id);
};

export const deleteUserTagByUserAndTag = (userId: string, tagId: string): UserTagData | null => {
  const userTag = userTagsDataStore
    .getEntities()
    .find((ut) => ut.userId === userId && ut.tagId === tagId);

  if (!userTag) {
    return null;
  }

  return userTagsDataStore.deleteEntity(userTag.id);
};

export const deleteUserTagsByUserId = (userId: string): UserTagData[] => {
  const userTags = getUserTagsByUserId(userId);
  return userTags
    .map((ut) => userTagsDataStore.deleteEntity(ut.id))
    .filter(Boolean) as UserTagData[];
};

export const deleteUserTagsByTagId = (tagId: string): UserTagData[] => {
  const userTags = getUserTagsByTagId(tagId);
  return userTags
    .map((ut) => userTagsDataStore.deleteEntity(ut.id))
    .filter(Boolean) as UserTagData[];
};
