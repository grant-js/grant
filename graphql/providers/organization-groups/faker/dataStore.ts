import { faker } from '@faker-js/faker';

import { AddOrganizationGroupInput, OrganizationGroup } from '@/graphql/generated/types';
import {
  createFakerDataStore,
  EntityConfig,
  generateAuditTimestamps,
} from '@/lib/providers/faker/genericDataStore';
const generateInitialOrganizationGroups = (): OrganizationGroup[] => {
  return [];
};
const organizationGroupConfig: EntityConfig<OrganizationGroup, AddOrganizationGroupInput, never> = {
  entityName: 'OrganizationGroup',
  dataFileName: 'organization-groups.json',
  generateId: () => faker.string.uuid(),
  generateEntity: (input: AddOrganizationGroupInput, id: string): OrganizationGroup => {
    const auditTimestamps = generateAuditTimestamps();
    return {
      id,
      organizationId: input.organizationId,
      groupId: input.groupId,
      ...auditTimestamps,
    };
  },
  updateEntity: () => {
    throw new Error('OrganizationGroup entities should be updated through specific methods');
  },
  sortableFields: ['organizationId', 'groupId', 'createdAt', 'updatedAt'],
  validationRules: [
    { field: 'id', unique: true },
    { field: 'organizationId', unique: false, required: true },
    { field: 'groupId', unique: false, required: true },
  ],
  initialData: generateInitialOrganizationGroups,
};
export const organizationGroupsDataStore = createFakerDataStore(organizationGroupConfig);
export const getOrganizationGroupsByOrganizationId = (
  organizationId: string
): OrganizationGroup[] => {
  const organizationGroups = organizationGroupsDataStore
    .getEntities()
    .filter((og) => og.organizationId === organizationId);
  return organizationGroups;
};
export const getOrganizationGroupsByGroupId = (groupId: string): OrganizationGroup[] => {
  return organizationGroupsDataStore.getEntities().filter((og) => og.groupId === groupId);
};
export const addOrganizationGroup = (
  organizationId: string,
  groupId: string
): OrganizationGroup => {
  const existingRelationship = organizationGroupsDataStore
    .getEntities()
    .find((og) => og.organizationId === organizationId && og.groupId === groupId);
  if (existingRelationship) {
    return existingRelationship;
  }
  return organizationGroupsDataStore.createEntity({ organizationId, groupId });
};
export const deleteOrganizationGroup = (id: string): OrganizationGroup | null => {
  return organizationGroupsDataStore.deleteEntity(id);
};
export const deleteOrganizationGroupByOrganizationAndGroup = (
  organizationId: string,
  groupId: string
): OrganizationGroup | null => {
  const organizationGroup = organizationGroupsDataStore
    .getEntities()
    .find((og) => og.organizationId === organizationId && og.groupId === groupId);
  if (!organizationGroup) {
    return null;
  }
  return organizationGroupsDataStore.deleteEntity(organizationGroup.id);
};
export const deleteOrganizationGroupsByOrganizationId = (
  organizationId: string
): OrganizationGroup[] => {
  const organizationGroups = organizationGroupsDataStore
    .getEntities()
    .filter((og) => og.organizationId === organizationId);
  organizationGroups.forEach((og) => organizationGroupsDataStore.deleteEntity(og.id));
  return organizationGroups;
};
export const deleteOrganizationGroupsByGroupId = (groupId: string): OrganizationGroup[] => {
  const organizationGroups = organizationGroupsDataStore
    .getEntities()
    .filter((og) => og.groupId === groupId);
  organizationGroups.forEach((og) => organizationGroupsDataStore.deleteEntity(og.id));
  return organizationGroups;
};
