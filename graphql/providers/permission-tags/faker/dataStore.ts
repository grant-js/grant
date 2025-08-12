import { faker } from '@faker-js/faker';

import { Auditable, Scope, Tenant } from '@/graphql/generated/types';
import { getPermissions } from '@/graphql/providers/permissions/faker/dataStore';
import { getTags } from '@/graphql/providers/tags/faker/dataStore';
import {
  createFakerDataStore,
  EntityConfig,
  generateAuditTimestamps,
} from '@/lib/providers/faker/genericDataStore';

import { getOrganizationTagsByOrganizationId } from '../../organization-tags/faker/dataStore';
import { getProjectTagsByProjectId } from '../../project-tags/faker/dataStore';
export interface PermissionTagData extends Auditable {
  permissionId: string;
  tagId: string;
}
export interface CreatePermissionTagInput {
  permissionId: string;
  tagId: string;
}
const generateFakePermissionTags = (count: number = 50): PermissionTagData[] => {
  const permissions = getPermissions();
  const tags = getTags();
  const permissionTags: PermissionTagData[] = [];
  for (let i = 0; i < count; i++) {
    const randomPermission = permissions[Math.floor(Math.random() * permissions.length)];
    const randomTag = tags[Math.floor(Math.random() * tags.length)];
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
const permissionTagConfig: EntityConfig<PermissionTagData, CreatePermissionTagInput, never> = {
  entityName: 'PermissionTag',
  dataFileName: 'permission-tags.json',
  generateId: () => faker.string.uuid(),
  generateEntity: (input: CreatePermissionTagInput, id: string): PermissionTagData => {
    const auditTimestamps = generateAuditTimestamps();
    return {
      id,
      permissionId: input.permissionId,
      tagId: input.tagId,
      ...auditTimestamps,
    };
  },
  updateEntity: () => {
    throw new Error('PermissionTag entities should be updated through specific methods');
  },
  sortableFields: ['permissionId', 'tagId', 'createdAt', 'updatedAt'],
  validationRules: [
    { field: 'id', unique: true },
    { field: 'permissionId', unique: false, required: true },
    { field: 'tagId', unique: false, required: true },
  ],
  initialData: generateFakePermissionTags,
};
export const permissionTagsDataStore = createFakerDataStore(permissionTagConfig);
export const getPermissionTagIdsByScope = (scope: Scope): string[] => {
  switch (scope.tenant) {
    case Tenant.Project:
      return getProjectTagsByProjectId(scope.id).map((pt) => pt.tagId);
    case Tenant.Organization:
      return getOrganizationTagsByOrganizationId(scope.id).map((ot) => ot.tagId);
    default:
      return getTags().map((t) => t.id);
  }
};
export const getPermissionTagsByPermissionId = (
  scope: Scope,
  permissionId: string
): PermissionTagData[] => {
  const permissionTags = permissionTagsDataStore
    .getEntities()
    .filter((pt) => pt.permissionId === permissionId);
  const scopedTagIds = getPermissionTagIdsByScope(scope);
  return permissionTags.filter((pt) => scopedTagIds.includes(pt.tagId));
};
export const getPermissionTagsByTagId = (tagId: string): PermissionTagData[] => {
  return permissionTagsDataStore.getEntities().filter((pt) => pt.tagId === tagId);
};
export const getPermissionTags = (): PermissionTagData[] => {
  return permissionTagsDataStore.getEntities();
};
export const createPermissionTag = (permissionId: string, tagId: string): PermissionTagData => {
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
  const permissionTags = permissionTagsDataStore
    .getEntities()
    .filter((pt) => pt.permissionId === permissionId);
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
