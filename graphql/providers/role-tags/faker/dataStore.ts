import { faker } from '@faker-js/faker';

import { AddRoleTagInput, RoleTag, Scope, Tenant } from '@/graphql/generated/types';
import { getOrganizationTagsByOrganizationId } from '@/graphql/providers/organization-tags/faker/dataStore';
import { getProjectTagsByProjectId } from '@/graphql/providers/project-tags/faker/dataStore';
import { getRoles } from '@/graphql/providers/roles/faker/dataStore';
import { getTags } from '@/graphql/providers/tags/faker/dataStore';
import {
  createFakerDataStore,
  EntityConfig,
  generateAuditTimestamps,
} from '@/lib/providers/faker/genericDataStore';
const generateFakeRoleTags = (count: number = 50): RoleTag[] => {
  const roles = getRoles();
  const tags = getTags();
  const roleTags: RoleTag[] = [];
  for (let i = 0; i < count; i++) {
    const randomRole = roles[Math.floor(Math.random() * roles.length)];
    const randomTag = tags[Math.floor(Math.random() * tags.length)];
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
const roleTagConfig: EntityConfig<RoleTag, AddRoleTagInput, never> = {
  entityName: 'RoleTag',
  dataFileName: 'role-tags.json',
  generateId: () => faker.string.uuid(),
  generateEntity: (input: AddRoleTagInput, id: string): RoleTag => {
    const auditTimestamps = generateAuditTimestamps();
    return {
      id,
      roleId: input.roleId,
      tagId: input.tagId,
      ...auditTimestamps,
    };
  },
  updateEntity: () => {
    throw new Error('RoleTag entities should be updated through specific methods');
  },
  sortableFields: ['roleId', 'tagId', 'createdAt', 'updatedAt'],
  validationRules: [
    { field: 'id', unique: true },
    { field: 'roleId', unique: false, required: true },
    { field: 'tagId', unique: false, required: true },
  ],
  initialData: generateFakeRoleTags,
};
export const roleTagsDataStore = createFakerDataStore(roleTagConfig);
export const getRoleTagIdsByScope = (scope: Scope): string[] => {
  switch (scope.tenant) {
    case Tenant.Project:
      return getProjectTagsByProjectId(scope.id).map((pt) => pt.tagId);
    case Tenant.Organization:
      return getOrganizationTagsByOrganizationId(scope.id).map((ot) => ot.tagId);
    default:
      return getTags().map((t) => t.id);
  }
};
export const getRoleTagsByRoleId = (scope: Scope, roleId: string): RoleTag[] => {
  const roleTags = roleTagsDataStore.getEntities().filter((rt) => rt.roleId === roleId);
  const scopedTagIds = getRoleTagIdsByScope(scope);
  return roleTags.filter((rt) => scopedTagIds.includes(rt.tagId));
};
export const getRoleTagsByTagId = (tagId: string): RoleTag[] => {
  return roleTagsDataStore.getEntities().filter((rt) => rt.tagId === tagId);
};
export const getRoleTags = (): RoleTag[] => {
  return roleTagsDataStore.getEntities();
};
export const createRoleTag = (roleId: string, tagId: string): RoleTag => {
  const existing = roleTagsDataStore
    .getEntities()
    .find((rt) => rt.roleId === roleId && rt.tagId === tagId);
  if (existing) {
    throw new Error(`RoleTag relationship already exists for role ${roleId} and tag ${tagId}`);
  }
  const newRoleTag = roleTagsDataStore.createEntity({ roleId, tagId });
  return newRoleTag;
};
export const deleteRoleTag = (id: string): RoleTag | null => {
  return roleTagsDataStore.deleteEntity(id);
};
export const deleteRoleTagByRoleAndTag = (roleId: string, tagId: string): RoleTag | null => {
  const roleTag = roleTagsDataStore
    .getEntities()
    .find((rt) => rt.roleId === roleId && rt.tagId === tagId);
  if (!roleTag) {
    return null;
  }
  return roleTagsDataStore.deleteEntity(roleTag.id);
};
export const deleteRoleTagsByRoleId = (roleId: string): RoleTag[] => {
  const roleTags = roleTagsDataStore.getEntities().filter((rt) => rt.roleId === roleId);
  return roleTags.map((rt) => roleTagsDataStore.deleteEntity(rt.id)).filter(Boolean) as RoleTag[];
};
export const deleteRoleTagsByTagId = (tagId: string): RoleTag[] => {
  const roleTags = getRoleTagsByTagId(tagId);
  return roleTags.map((rt) => roleTagsDataStore.deleteEntity(rt.id)).filter(Boolean) as RoleTag[];
};
