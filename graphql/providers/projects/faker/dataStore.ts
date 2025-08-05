import { faker } from '@faker-js/faker';

import {
  CreateProjectInput,
  UpdateProjectInput,
  ProjectSortInput,
} from '@/graphql/generated/types';
import { ProjectData } from '@/graphql/providers/projects/types';
import {
  createFakerDataStore,
  EntityConfig,
  generateAuditTimestamps,
  updateAuditTimestamp,
} from '@/lib/providers/faker/genericDataStore';

// Generate initial projects (hardcoded)
const generateInitialProjects = (): ProjectData[] => {
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

// Projects-specific configuration
const projectsConfig: EntityConfig<ProjectData, CreateProjectInput, UpdateProjectInput> = {
  entityName: 'Project',
  dataFileName: 'projects.json',

  // Generate UUID for project IDs
  generateId: () => faker.string.uuid(),

  // Generate project entity from input
  generateEntity: (input: CreateProjectInput, id: string): ProjectData => {
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

  // Update project entity
  updateEntity: (entity: ProjectData, input: UpdateProjectInput): ProjectData => {
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

  // Sortable fields
  sortableFields: ['name', 'slug', 'createdAt', 'updatedAt'],

  // Validation rules
  validationRules: [
    { field: 'id', unique: true },
    { field: 'name', unique: true, required: true },
    { field: 'slug', unique: true, required: true },
  ],

  // Initial data
  initialData: generateInitialProjects,
};

// Create the projects data store instance
export const projectsDataStore = createFakerDataStore(projectsConfig);

// Export the main functions with the same interface as the original
export const initializeDataStore = () => projectsDataStore.getEntities();

export const sortProjects = (
  projects: ProjectData[],
  sortConfig?: ProjectSortInput
): ProjectData[] => {
  if (!sortConfig) return projects;

  return projectsDataStore.getEntities({
    field: sortConfig.field,
    order: sortConfig.order,
  });
};

// Updated getProjects function with optional ids parameter
export const getProjects = (sortConfig?: ProjectSortInput, ids?: string[]): ProjectData[] => {
  let allProjects = projectsDataStore.getEntities(
    sortConfig
      ? {
          field: sortConfig.field,
          order: sortConfig.order,
        }
      : undefined
  );

  // If ids are provided, filter by those IDs
  if (ids && ids.length > 0) {
    allProjects = allProjects.filter((project) => ids.includes(project.id));
  }

  return allProjects;
};

export const createProject = (input: CreateProjectInput): ProjectData => {
  return projectsDataStore.createEntity(input);
};

export const updateProject = (projectId: string, input: UpdateProjectInput): ProjectData | null => {
  return projectsDataStore.updateEntity(projectId, input);
};

export const deleteProject = (projectId: string): ProjectData | null => {
  return projectsDataStore.deleteEntity(projectId);
};
