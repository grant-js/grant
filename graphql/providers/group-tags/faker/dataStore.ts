import { faker } from '@faker-js/faker';

import { Auditable, Scope, Tenant } from '@/graphql/generated/types';
import { getGroups } from '@/graphql/providers/groups/faker/dataStore';
import { getTags } from '@/graphql/providers/tags/faker/dataStore';
import {
  createFakerDataStore,
  EntityConfig,
  generateAuditTimestamps,
} from '@/lib/providers/faker/genericDataStore';

import { getOrganizationTagsByOrganizationId } from '../../organization-tags/faker/dataStore';
import { getProjectTagsByProjectId } from '../../project-tags/faker/dataStore';

// Type for GroupTag data without the resolved fields
export interface GroupTagData extends Auditable {
  groupId: string;
  tagId: string;
}

// Input type for creating group-tag relationships
export interface CreateGroupTagInput {
  groupId: string;
  tagId: string;
}

// Generate fake group-tag relationships
const generateFakeGroupTags = (count: number = 50): GroupTagData[] => {
  const groups = getGroups();
  const tags = getTags();

  const groupTags: GroupTagData[] = [];

  // Create some random group-tag relationships
  for (let i = 0; i < count; i++) {
    const randomGroup = groups[Math.floor(Math.random() * groups.length)];
    const randomTag = tags[Math.floor(Math.random() * tags.length)];

    // Avoid duplicates
    const exists = groupTags.some(
      (gt) => gt.groupId === randomGroup.id && gt.tagId === randomTag.id
    );
    if (!exists) {
      const auditTimestamps = generateAuditTimestamps();
      groupTags.push({
        id: faker.string.uuid(),
        groupId: randomGroup.id,
        tagId: randomTag.id,
        ...auditTimestamps,
      });
    }
  }

  return groupTags;
};

// GroupTag-specific configuration
const groupTagConfig: EntityConfig<GroupTagData, CreateGroupTagInput, never> = {
  entityName: 'GroupTag',
  dataFileName: 'group-tags.json',

  // Generate UUID for group-tag IDs
  generateId: () => faker.string.uuid(),

  // Generate group-tag entity from input
  generateEntity: (input: CreateGroupTagInput, id: string): GroupTagData => {
    const auditTimestamps = generateAuditTimestamps();
    return {
      id,
      groupId: input.groupId,
      tagId: input.tagId,
      ...auditTimestamps,
    };
  },

  // Update group-tag entity (not used for this pivot)
  updateEntity: () => {
    throw new Error('GroupTag entities should be updated through specific methods');
  },

  // Sortable fields
  sortableFields: ['groupId', 'tagId', 'createdAt', 'updatedAt'],

  // Validation rules
  validationRules: [
    { field: 'id', unique: true },
    { field: 'groupId', unique: false, required: true },
    { field: 'tagId', unique: false, required: true },
  ],

  // Initial data
  initialData: generateFakeGroupTags,
};

// Create the group-tags data store instance
export const groupTagsDataStore = createFakerDataStore(groupTagConfig);

// Helper function to get tag IDs based on scope
export const getGroupTagIdsByScope = (scope: Scope): string[] => {
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

// Helper functions for group-tag operations
export const getGroupTagsByGroupId = (scope: Scope, groupId: string): GroupTagData[] => {
  const groupTags = groupTagsDataStore.getEntities().filter((gt) => gt.groupId === groupId);

  const scopedTagIds = getGroupTagIdsByScope(scope);
  return groupTags.filter((gt) => scopedTagIds.includes(gt.tagId));
};

export const getGroupTagsByTagId = (tagId: string): GroupTagData[] => {
  return groupTagsDataStore.getEntities().filter((gt) => gt.tagId === tagId);
};

export const getGroupTags = (): GroupTagData[] => {
  return groupTagsDataStore.getEntities();
};

export const createGroupTag = (groupId: string, tagId: string): GroupTagData => {
  // Check if relationship already exists
  const existing = groupTagsDataStore
    .getEntities()
    .find((gt) => gt.groupId === groupId && gt.tagId === tagId);

  if (existing) {
    throw new Error(`GroupTag relationship already exists for group ${groupId} and tag ${tagId}`);
  }

  const newGroupTag = groupTagsDataStore.createEntity({ groupId, tagId });
  return newGroupTag;
};

export const deleteGroupTag = (id: string): GroupTagData | null => {
  return groupTagsDataStore.deleteEntity(id);
};

export const deleteGroupTagByGroupAndTag = (
  groupId: string,
  tagId: string
): GroupTagData | null => {
  const groupTag = groupTagsDataStore
    .getEntities()
    .find((gt) => gt.groupId === groupId && gt.tagId === tagId);

  if (!groupTag) {
    return null;
  }

  return groupTagsDataStore.deleteEntity(groupTag.id);
};

export const deleteGroupTagsByGroupId = (groupId: string): GroupTagData[] => {
  const groupTags = groupTagsDataStore.getEntities().filter((gt) => gt.groupId === groupId);
  return groupTags
    .map((gt) => groupTagsDataStore.deleteEntity(gt.id))
    .filter(Boolean) as GroupTagData[];
};

export const deleteGroupTagsByTagId = (tagId: string): GroupTagData[] => {
  const groupTags = getGroupTagsByTagId(tagId);
  return groupTags
    .map((gt) => groupTagsDataStore.deleteEntity(gt.id))
    .filter(Boolean) as GroupTagData[];
};
