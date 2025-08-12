import { faker } from '@faker-js/faker';

import { TagSortInput } from '@/graphql/generated/types';
import { Tag, CreateTagInput, UpdateTagInput } from '@/graphql/generated/types';
import {
  createFakerDataStore,
  EntityConfig,
  generateAuditTimestamps,
  updateAuditTimestamp,
} from '@/lib/providers/faker/genericDataStore';
import { getAvailableTagColors } from '@/lib/tag-colors';
const generateFakeTags = (count: number = 20): Tag[] => {
  const availableColors = getAvailableTagColors();
  const tagNames = [
    'Frontend',
    'Backend',
    'DevOps',
    'Design',
    'Testing',
    'Security',
    'Performance',
    'Accessibility',
    'Mobile',
    'Desktop',
    'API',
    'Database',
    'Cloud',
    'AI',
    'Machine Learning',
    'Data Science',
    'Analytics',
    'Marketing',
    'Sales',
    'Support',
  ];
  return Array.from({ length: count }, (_, index) => {
    const auditTimestamps = generateAuditTimestamps();
    return {
      id: faker.string.uuid(),
      name: tagNames[index] || faker.word.noun(),
      color: availableColors[index % availableColors.length],
      ...auditTimestamps,
    };
  });
};
const tagsConfig: EntityConfig<Tag, CreateTagInput, UpdateTagInput> = {
  entityName: 'Tag',
  dataFileName: 'tags.json',
  generateId: () => faker.string.uuid(),
  generateEntity: (input: CreateTagInput, id: string): Tag => {
    const auditTimestamps = generateAuditTimestamps();
    return {
      id,
      name: input.name,
      color: input.color,
      ...auditTimestamps,
    };
  },
  updateEntity: (entity: Tag, input: UpdateTagInput): Tag => {
    const auditTimestamp = updateAuditTimestamp();
    return {
      ...entity,
      name: input.name ?? entity.name,
      color: input.color ?? entity.color,
      ...auditTimestamp,
    };
  },
  sortableFields: ['name', 'color', 'createdAt', 'updatedAt'],
  validationRules: [
    { field: 'id', unique: true },
    { field: 'name', unique: true, required: true },
  ],
  initialData: generateFakeTags,
};
export const tagsDataStore = createFakerDataStore(tagsConfig);
export const initializeDataStore = () => tagsDataStore.getEntities();
export const sortTags = (tags: Tag[], sortConfig?: TagSortInput): Tag[] => {
  if (!sortConfig) return tags;
  return tagsDataStore.getEntities({
    field: sortConfig.field,
    order: sortConfig.direction,
  });
};
export const getTags = (sortConfig?: TagSortInput, ids?: string[]): Tag[] => {
  let allTags = tagsDataStore.getEntities(
    sortConfig
      ? {
          field: sortConfig.field,
          order: sortConfig.direction,
        }
      : undefined
  );
  if (ids && ids.length > 0) {
    allTags = allTags.filter((tag) => ids.includes(tag.id));
  }
  return allTags;
};
export const createTag = (input: CreateTagInput): Tag => {
  return tagsDataStore.createEntity(input);
};
export const updateTag = (tagId: string, input: UpdateTagInput): Tag | null => {
  return tagsDataStore.updateEntity(tagId, input);
};
export const deleteTag = (tagId: string): Tag | null => {
  return tagsDataStore.deleteEntity(tagId);
};
