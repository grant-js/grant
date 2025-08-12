import { faker } from '@faker-js/faker';

import { AddProjectPermissionInput, ProjectPermission } from '@/graphql/generated/types';
import {
  createFakerDataStore,
  EntityConfig,
  generateAuditTimestamps,
} from '@/lib/providers/faker/genericDataStore';
const generateInitialProjectPermissions = (): ProjectPermission[] => {
  return [];
};
const projectPermissionConfig: EntityConfig<ProjectPermission, AddProjectPermissionInput, never> = {
  entityName: 'ProjectPermission',
  dataFileName: 'project-permissions.json',
  generateId: () => faker.string.uuid(),
  generateEntity: (input: AddProjectPermissionInput, id: string): ProjectPermission => {
    const auditTimestamps = generateAuditTimestamps();
    return {
      id,
      projectId: input.projectId,
      permissionId: input.permissionId,
      ...auditTimestamps,
    };
  },
  updateEntity: () => {
    throw new Error('ProjectPermission entities should be updated through specific methods');
  },
  sortableFields: ['projectId', 'permissionId', 'createdAt', 'updatedAt'],
  validationRules: [
    { field: 'id', unique: true },
    { field: 'projectId', unique: false, required: true },
    { field: 'permissionId', unique: false, required: true },
  ],
  initialData: generateInitialProjectPermissions,
};
export const projectPermissionsDataStore = createFakerDataStore(projectPermissionConfig);
export const getProjectPermissionsByProjectId = (projectId: string): ProjectPermission[] => {
  const projectPermissions = projectPermissionsDataStore
    .getEntities()
    .filter((pp) => pp.projectId === projectId);
  return projectPermissions;
};
export const getProjectPermissionsByPermissionId = (permissionId: string): ProjectPermission[] => {
  return projectPermissionsDataStore.getEntities().filter((pp) => pp.permissionId === permissionId);
};
export const addProjectPermission = (
  projectId: string,
  permissionId: string
): ProjectPermission => {
  const existingRelationship = projectPermissionsDataStore
    .getEntities()
    .find((pp) => pp.projectId === projectId && pp.permissionId === permissionId);
  if (existingRelationship) {
    return existingRelationship;
  }
  return projectPermissionsDataStore.createEntity({ projectId, permissionId });
};
export const deleteProjectPermission = (id: string): ProjectPermission | null => {
  return projectPermissionsDataStore.deleteEntity(id);
};
export const deleteProjectPermissionByProjectAndPermission = (
  projectId: string,
  permissionId: string
): ProjectPermission | null => {
  const projectPermission = projectPermissionsDataStore
    .getEntities()
    .find((pp) => pp.projectId === projectId && pp.permissionId === permissionId);
  if (!projectPermission) {
    return null;
  }
  return projectPermissionsDataStore.deleteEntity(projectPermission.id);
};
export const deleteProjectPermissionsByProjectId = (projectId: string): ProjectPermission[] => {
  const projectPermissions = projectPermissionsDataStore
    .getEntities()
    .filter((pp) => pp.projectId === projectId);
  projectPermissions.forEach((pp) => projectPermissionsDataStore.deleteEntity(pp.id));
  return projectPermissions;
};
export const deleteProjectPermissionsByPermissionId = (
  permissionId: string
): ProjectPermission[] => {
  const projectPermissions = projectPermissionsDataStore
    .getEntities()
    .filter((pp) => pp.permissionId === permissionId);
  projectPermissions.forEach((pp) => projectPermissionsDataStore.deleteEntity(pp.id));
  return projectPermissions;
};
