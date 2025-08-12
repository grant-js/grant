import { faker } from '@faker-js/faker';

import { AddOrganizationTagInput, OrganizationTag } from '@/graphql/generated/types';
import {
  createFakerDataStore,
  EntityConfig,
  generateAuditTimestamps,
} from '@/lib/providers/faker/genericDataStore';
const generateInitialOrganizationTags = (): OrganizationTag[] => {
  return [];
};
const organizationTagConfig: EntityConfig<OrganizationTag, AddOrganizationTagInput, never> = {
  entityName: 'OrganizationTag',
  dataFileName: 'organization-tags.json',
  generateId: () => faker.string.uuid(),
  generateEntity: (input: AddOrganizationTagInput, id: string): OrganizationTag => {
    const auditTimestamps = generateAuditTimestamps();
    return {
      id,
      organizationId: input.organizationId,
      tagId: input.tagId,
      ...auditTimestamps,
    };
  },
  updateEntity: () => {
    throw new Error('OrganizationTag entities should be updated through specific methods');
  },
  sortableFields: ['organizationId', 'tagId', 'createdAt', 'updatedAt'],
  validationRules: [
    { field: 'id', unique: true },
    { field: 'organizationId', unique: false, required: true },
    { field: 'tagId', unique: false, required: true },
  ],
  initialData: generateInitialOrganizationTags,
};
export const organizationTagsDataStore = createFakerDataStore(organizationTagConfig);
export const getOrganizationTagsByOrganizationId = (organizationId: string): OrganizationTag[] => {
  const organizationTags = organizationTagsDataStore
    .getEntities()
    .filter((ot) => ot.organizationId === organizationId);
  return organizationTags;
};
export const getOrganizationTagsByTagId = (tagId: string): OrganizationTag[] => {
  return organizationTagsDataStore.getEntities().filter((ot) => ot.tagId === tagId);
};
export const addOrganizationTag = (organizationId: string, tagId: string): OrganizationTag => {
  const existingRelationship = organizationTagsDataStore
    .getEntities()
    .find((ot) => ot.organizationId === organizationId && ot.tagId === tagId);
  if (existingRelationship) {
    return existingRelationship;
  }
  return organizationTagsDataStore.createEntity({ organizationId, tagId });
};
export const deleteOrganizationTag = (id: string): OrganizationTag | null => {
  return organizationTagsDataStore.deleteEntity(id);
};
export const deleteOrganizationTagByOrganizationAndTag = (
  organizationId: string,
  tagId: string
): OrganizationTag | null => {
  const organizationTag = organizationTagsDataStore
    .getEntities()
    .find((ot) => ot.organizationId === organizationId && ot.tagId === tagId);
  if (!organizationTag) {
    return null;
  }
  return organizationTagsDataStore.deleteEntity(organizationTag.id);
};
export const deleteOrganizationTagsByOrganizationId = (
  organizationId: string
): OrganizationTag[] => {
  const organizationTags = organizationTagsDataStore
    .getEntities()
    .filter((ot) => ot.organizationId === organizationId);
  organizationTags.forEach((ot) => organizationTagsDataStore.deleteEntity(ot.id));
  return organizationTags;
};
export const deleteOrganizationTagsByTagId = (tagId: string): OrganizationTag[] => {
  const organizationTags = organizationTagsDataStore
    .getEntities()
    .filter((ot) => ot.tagId === tagId);
  organizationTags.forEach((ot) => organizationTagsDataStore.deleteEntity(ot.id));
  return organizationTags;
};
