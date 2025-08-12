import { faker } from '@faker-js/faker';

import { AddProjectTagInput, ProjectTag } from '@/graphql/generated/types';
import {
  createFakerDataStore,
  EntityConfig,
  generateAuditTimestamps,
} from '@/lib/providers/faker/genericDataStore';
const generateInitialProjectTags = (): ProjectTag[] => {
  return [];
};
const projectTagConfig: EntityConfig<ProjectTag, AddProjectTagInput, never> = {
  entityName: 'ProjectTag',
  dataFileName: 'project-tags.json',
  generateId: () => faker.string.uuid(),
  generateEntity: (input: AddProjectTagInput, id: string): ProjectTag => {
    const auditTimestamps = generateAuditTimestamps();
    return {
      id,
      projectId: input.projectId,
      tagId: input.tagId,
      ...auditTimestamps,
    };
  },
  updateEntity: () => {
    throw new Error('ProjectTag entities should be updated through specific methods');
  },
  sortableFields: ['projectId', 'tagId', 'createdAt', 'updatedAt'],
  validationRules: [
    { field: 'id', unique: true },
    { field: 'projectId', unique: false, required: true },
    { field: 'tagId', unique: false, required: true },
  ],
  initialData: generateInitialProjectTags,
};
export const projectTagsDataStore = createFakerDataStore(projectTagConfig);
export const getProjectTagsByProjectId = (projectId: string): ProjectTag[] => {
  const projectTags = projectTagsDataStore.getEntities().filter((pt) => pt.projectId === projectId);
  return projectTags;
};
export const getProjectTagsByTagId = (tagId: string): ProjectTag[] => {
  return projectTagsDataStore.getEntities().filter((pt) => pt.tagId === tagId);
};
export const addProjectTag = (projectId: string, tagId: string): ProjectTag => {
  const existingRelationship = projectTagsDataStore
    .getEntities()
    .find((pt) => pt.projectId === projectId && pt.tagId === tagId);
  if (existingRelationship) {
    return existingRelationship;
  }
  return projectTagsDataStore.createEntity({ projectId, tagId });
};
export const deleteProjectTag = (id: string): ProjectTag | null => {
  return projectTagsDataStore.deleteEntity(id);
};
export const deleteProjectTagByProjectAndTag = (
  projectId: string,
  tagId: string
): ProjectTag | null => {
  const projectTag = projectTagsDataStore
    .getEntities()
    .find((pt) => pt.projectId === projectId && pt.tagId === tagId);
  if (!projectTag) {
    return null;
  }
  return projectTagsDataStore.deleteEntity(projectTag.id);
};
export const deleteProjectTagsByProjectId = (projectId: string): ProjectTag[] => {
  const projectTags = projectTagsDataStore.getEntities().filter((pt) => pt.projectId === projectId);
  projectTags.forEach((pt) => projectTagsDataStore.deleteEntity(pt.id));
  return projectTags;
};
export const deleteProjectTagsByTagId = (tagId: string): ProjectTag[] => {
  const projectTags = projectTagsDataStore.getEntities().filter((pt) => pt.tagId === tagId);
  projectTags.forEach((pt) => projectTagsDataStore.deleteEntity(pt.id));
  return projectTags;
};
