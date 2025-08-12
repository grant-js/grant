import { faker } from '@faker-js/faker';

import {
  CreateProjectInput,
  Project,
  ProjectSortInput,
  UpdateProjectInput,
} from '@/graphql/generated/types';
import {
  createFakerDataStore,
  EntityConfig,
  generateAuditTimestamps,
  updateAuditTimestamp,
} from '@/lib/providers/faker/genericDataStore';
const generateInitialProjects = (): Project[] => {
  const auditTimestamps = generateAuditTimestamps();
  return [
    {
      id: faker.string.uuid(),
      name: 'E-commerce Platform',
      slug: 'ecommerce-platform',
      description: 'Modern e-commerce platform with payment integration',
      ...auditTimestamps,
    },
    {
      id: faker.string.uuid(),
      name: 'Mobile App',
      slug: 'mobile-app',
      description: 'Cross-platform mobile application',
      ...auditTimestamps,
    },
    {
      id: faker.string.uuid(),
      name: 'API Gateway',
      slug: 'api-gateway',
      description: 'Microservices API gateway and load balancer',
      ...auditTimestamps,
    },
    {
      id: faker.string.uuid(),
      name: 'Analytics Dashboard',
      slug: 'analytics-dashboard',
      description: 'Real-time analytics and reporting dashboard',
      ...auditTimestamps,
    },
  ];
};
const projectsConfig: EntityConfig<Project, CreateProjectInput, UpdateProjectInput> = {
  entityName: 'Project',
  dataFileName: 'projects.json',
  generateId: () => faker.string.uuid(),
  generateEntity: (input: CreateProjectInput, id: string): Project => {
    const auditTimestamps = generateAuditTimestamps();
    return {
      id,
      name: input.name,
      slug: input.name
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, ''),
      description: input.description || null,
      ...auditTimestamps,
    };
  },
  updateEntity: (entity: Project, input: UpdateProjectInput): Project => {
    const auditTimestamp = updateAuditTimestamp();
    return {
      ...entity,
      name: input.name || entity.name,
      slug: input.name
        ? input.name
            .toLowerCase()
            .replace(/\s+/g, '-')
            .replace(/[^a-z0-9-]/g, '')
        : entity.slug,
      description: input.description !== undefined ? input.description : entity.description,
      ...auditTimestamp,
    };
  },
  sortableFields: ['name', 'slug', 'createdAt', 'updatedAt'],
  validationRules: [
    { field: 'id', unique: true },
    { field: 'name', unique: true, required: true },
    { field: 'slug', unique: true, required: true },
  ],
  initialData: generateInitialProjects,
};
export const projectsDataStore = createFakerDataStore(projectsConfig);
export const initializeDataStore = () => projectsDataStore.getEntities();
export const sortProjects = (projects: Project[], sortConfig?: ProjectSortInput): Project[] => {
  if (!sortConfig) return projects;
  return projectsDataStore.getEntities({
    field: sortConfig.field,
    order: sortConfig.order,
  });
};
export const getProjects = (sortConfig?: ProjectSortInput, ids?: string[]): Project[] => {
  let allProjects = projectsDataStore.getEntities(
    sortConfig
      ? {
          field: sortConfig.field,
          order: sortConfig.order,
        }
      : undefined
  );
  if (ids && ids.length > 0) {
    allProjects = allProjects.filter((project) => ids.includes(project.id));
  }
  return allProjects;
};
export const createProject = (input: CreateProjectInput): Project => {
  return projectsDataStore.createEntity(input);
};
export const updateProject = (projectId: string, input: UpdateProjectInput): Project | null => {
  return projectsDataStore.updateEntity(projectId, input);
};
export const deleteProject = (projectId: string): Project | null => {
  return projectsDataStore.deleteEntity(projectId);
};
