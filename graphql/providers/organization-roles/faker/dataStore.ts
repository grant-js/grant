import { faker } from '@faker-js/faker';

import { AddOrganizationRoleInput, OrganizationRole } from '@/graphql/generated/types';
import {
  createFakerDataStore,
  EntityConfig,
  generateAuditTimestamps,
} from '@/lib/providers/faker/genericDataStore';
const generateInitialOrganizationRoles = (): OrganizationRole[] => {
  return [];
};
const organizationRoleConfig: EntityConfig<OrganizationRole, AddOrganizationRoleInput, never> = {
  entityName: 'OrganizationRole',
  dataFileName: 'organization-roles.json',
  generateId: () => faker.string.uuid(),
  generateEntity: (input: AddOrganizationRoleInput, id: string): OrganizationRole => {
    const auditTimestamps = generateAuditTimestamps();
    return {
      id,
      organizationId: input.organizationId,
      roleId: input.roleId,
      ...auditTimestamps,
    };
  },
  updateEntity: () => {
    throw new Error('OrganizationRole entities should be updated through specific methods');
  },
  sortableFields: ['organizationId', 'roleId', 'createdAt', 'updatedAt'],
  validationRules: [
    { field: 'id', unique: true },
    { field: 'organizationId', unique: false, required: true },
    { field: 'roleId', unique: false, required: true },
  ],
  initialData: generateInitialOrganizationRoles,
};
export const organizationRolesDataStore = createFakerDataStore(organizationRoleConfig);
export const getOrganizationRolesByOrganizationId = (
  organizationId: string
): OrganizationRole[] => {
  const organizationRoles = organizationRolesDataStore
    .getEntities()
    .filter((or) => or.organizationId === organizationId);
  return organizationRoles;
};
export const getOrganizationRolesByRoleId = (roleId: string): OrganizationRole[] => {
  return organizationRolesDataStore.getEntities().filter((or) => or.roleId === roleId);
};
export const addOrganizationRole = (organizationId: string, roleId: string): OrganizationRole => {
  const existingRelationship = organizationRolesDataStore
    .getEntities()
    .find((or) => or.organizationId === organizationId && or.roleId === roleId);
  if (existingRelationship) {
    return existingRelationship;
  }
  return organizationRolesDataStore.createEntity({ organizationId, roleId });
};
export const deleteOrganizationRole = (id: string): OrganizationRole | null => {
  return organizationRolesDataStore.deleteEntity(id);
};
export const deleteOrganizationRoleByOrganizationAndRole = (
  organizationId: string,
  roleId: string
): OrganizationRole | null => {
  const organizationRole = organizationRolesDataStore
    .getEntities()
    .find((or) => or.organizationId === organizationId && or.roleId === roleId);
  if (!organizationRole) {
    return null;
  }
  return organizationRolesDataStore.deleteEntity(organizationRole.id);
};
export const deleteOrganizationRolesByOrganizationId = (
  organizationId: string
): OrganizationRole[] => {
  const organizationRoles = organizationRolesDataStore
    .getEntities()
    .filter((or) => or.organizationId === organizationId);
  organizationRoles.forEach((or) => organizationRolesDataStore.deleteEntity(or.id));
  return organizationRoles;
};
export const deleteOrganizationRolesByRoleId = (roleId: string): OrganizationRole[] => {
  const organizationRoles = organizationRolesDataStore
    .getEntities()
    .filter((or) => or.roleId === roleId);
  organizationRoles.forEach((or) => organizationRolesDataStore.deleteEntity(or.id));
  return organizationRoles;
};
