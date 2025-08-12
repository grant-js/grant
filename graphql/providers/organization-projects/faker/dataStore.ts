import { faker } from '@faker-js/faker';

import { AddOrganizationProjectInput, OrganizationProject } from '@/graphql/generated/types';
import { getOrganizations } from '@/graphql/providers/organizations/faker/dataStore';
import { getProjects } from '@/graphql/providers/projects/faker/dataStore';
import {
  createFakerDataStore,
  EntityConfig,
  generateAuditTimestamps,
} from '@/lib/providers/faker/genericDataStore';
const generateFakeOrganizationProjects = (count: number = 100): OrganizationProject[] => {
  const organizations = getOrganizations();
  const projects = getProjects();
  const organizationProjects: OrganizationProject[] = [];
  for (let i = 0; i < count; i++) {
    const randomOrganization = organizations[Math.floor(Math.random() * organizations.length)];
    const randomProject = projects[Math.floor(Math.random() * projects.length)];
    const exists = organizationProjects.some(
      (op) => op.organizationId === randomOrganization.id && op.projectId === randomProject.id
    );
    if (!exists) {
      const auditTimestamps = generateAuditTimestamps();
      organizationProjects.push({
        id: faker.string.uuid(),
        organizationId: randomOrganization.id,
        projectId: randomProject.id,
        ...auditTimestamps,
      });
    }
  }
  return organizationProjects;
};
const organizationProjectConfig: EntityConfig<
  OrganizationProject,
  AddOrganizationProjectInput,
  never
> = {
  entityName: 'OrganizationProject',
  dataFileName: 'organization-projects.json',
  generateId: () => faker.string.uuid(),
  generateEntity: (input: AddOrganizationProjectInput, id: string): OrganizationProject => {
    const auditTimestamps = generateAuditTimestamps();
    return {
      id,
      organizationId: input.organizationId,
      projectId: input.projectId,
      ...auditTimestamps,
    };
  },
  updateEntity: () => {
    throw new Error('OrganizationProject entities should be updated through specific methods');
  },
  sortableFields: ['organizationId', 'projectId', 'createdAt', 'updatedAt'],
  validationRules: [
    { field: 'id', unique: true },
    { field: 'organizationId', unique: false, required: true },
    { field: 'projectId', unique: false, required: true },
  ],
  initialData: generateFakeOrganizationProjects,
};
export const organizationProjectsDataStore = createFakerDataStore(organizationProjectConfig);
export const getOrganizationProjectsByOrganizationId = (
  organizationId: string
): OrganizationProject[] => {
  const organizationProjects = organizationProjectsDataStore
    .getEntities()
    .filter((op) => op.organizationId === organizationId);
  return organizationProjects;
};
export const getOrganizationProjectsByProjectId = (projectId: string): OrganizationProject[] => {
  return organizationProjectsDataStore.getEntities().filter((op) => op.projectId === projectId);
};
export const addOrganizationProject = (
  organizationId: string,
  projectId: string
): OrganizationProject => {
  const existingRelationship = organizationProjectsDataStore
    .getEntities()
    .find((op) => op.organizationId === organizationId && op.projectId === projectId);
  if (existingRelationship) {
    return existingRelationship;
  }
  return organizationProjectsDataStore.createEntity({ organizationId, projectId });
};
export const deleteOrganizationProject = (id: string): OrganizationProject | null => {
  return organizationProjectsDataStore.deleteEntity(id);
};
export const deleteOrganizationProjectByOrganizationAndProject = (
  organizationId: string,
  projectId: string
): OrganizationProject | null => {
  const organizationProject = organizationProjectsDataStore
    .getEntities()
    .find((op) => op.organizationId === organizationId && op.projectId === projectId);
  if (!organizationProject) {
    return null;
  }
  return organizationProjectsDataStore.deleteEntity(organizationProject.id);
};
export const deleteOrganizationProjectsByOrganizationId = (
  organizationId: string
): OrganizationProject[] => {
  const organizationProjects = organizationProjectsDataStore
    .getEntities()
    .filter((op) => op.organizationId === organizationId);
  organizationProjects.forEach((op) => organizationProjectsDataStore.deleteEntity(op.id));
  return organizationProjects;
};
export const deleteOrganizationProjectsByProjectId = (projectId: string): OrganizationProject[] => {
  const organizationProjects = organizationProjectsDataStore
    .getEntities()
    .filter((op) => op.projectId === projectId);
  organizationProjects.forEach((op) => organizationProjectsDataStore.deleteEntity(op.id));
  return organizationProjects;
};
