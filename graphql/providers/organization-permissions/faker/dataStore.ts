import { faker } from '@faker-js/faker';

import { AddOrganizationPermissionInput, OrganizationPermission } from '@/graphql/generated/types';
import {
  createFakerDataStore,
  EntityConfig,
  generateAuditTimestamps,
} from '@/lib/providers/faker/genericDataStore';
const generateInitialOrganizationPermissions = (): OrganizationPermission[] => {
  return [];
};
const organizationPermissionConfig: EntityConfig<
  OrganizationPermission,
  AddOrganizationPermissionInput,
  never
> = {
  entityName: 'OrganizationPermission',
  dataFileName: 'organization-permissions.json',
  generateId: () => faker.string.uuid(),
  generateEntity: (input: AddOrganizationPermissionInput, id: string): OrganizationPermission => {
    const auditTimestamps = generateAuditTimestamps();
    return {
      id,
      organizationId: input.organizationId,
      permissionId: input.permissionId,
      ...auditTimestamps,
    };
  },
  updateEntity: () => {
    throw new Error('OrganizationPermission entities should be updated through specific methods');
  },
  sortableFields: ['organizationId', 'permissionId', 'createdAt', 'updatedAt'],
  validationRules: [
    { field: 'id', unique: true },
    { field: 'organizationId', unique: false, required: true },
    { field: 'permissionId', unique: false, required: true },
  ],
  initialData: generateInitialOrganizationPermissions,
};
export const organizationPermissionsDataStore = createFakerDataStore(organizationPermissionConfig);
export const getOrganizationPermissionsByOrganizationId = (
  organizationId: string
): OrganizationPermission[] => {
  const organizationPermissions = organizationPermissionsDataStore
    .getEntities()
    .filter((op) => op.organizationId === organizationId);
  return organizationPermissions;
};
export const getOrganizationPermissionsByPermissionId = (
  permissionId: string
): OrganizationPermission[] => {
  return organizationPermissionsDataStore
    .getEntities()
    .filter((op) => op.permissionId === permissionId);
};
export const addOrganizationPermission = (
  organizationId: string,
  permissionId: string
): OrganizationPermission => {
  const existingRelationship = organizationPermissionsDataStore
    .getEntities()
    .find((op) => op.organizationId === organizationId && op.permissionId === permissionId);
  if (existingRelationship) {
    return existingRelationship;
  }
  return organizationPermissionsDataStore.createEntity({ organizationId, permissionId });
};
export const deleteOrganizationPermission = (id: string): OrganizationPermission | null => {
  return organizationPermissionsDataStore.deleteEntity(id);
};
export const deleteOrganizationPermissionByOrganizationAndPermission = (
  organizationId: string,
  permissionId: string
): OrganizationPermission | null => {
  const organizationPermission = organizationPermissionsDataStore
    .getEntities()
    .find((op) => op.organizationId === organizationId && op.permissionId === permissionId);
  if (!organizationPermission) {
    return null;
  }
  return organizationPermissionsDataStore.deleteEntity(organizationPermission.id);
};
export const deleteOrganizationPermissionsByOrganizationId = (
  organizationId: string
): OrganizationPermission[] => {
  const organizationPermissions = organizationPermissionsDataStore
    .getEntities()
    .filter((op) => op.organizationId === organizationId);
  organizationPermissions.forEach((op) => organizationPermissionsDataStore.deleteEntity(op.id));
  return organizationPermissions;
};
export const deleteOrganizationPermissionsByPermissionId = (
  permissionId: string
): OrganizationPermission[] => {
  const organizationPermissions = organizationPermissionsDataStore
    .getEntities()
    .filter((op) => op.permissionId === permissionId);
  organizationPermissions.forEach((op) => organizationPermissionsDataStore.deleteEntity(op.id));
  return organizationPermissions;
};
