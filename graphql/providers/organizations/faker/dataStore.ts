import { faker } from '@faker-js/faker';

import {
  CreateOrganizationInput,
  UpdateOrganizationInput,
  OrganizationSortInput,
  Organization,
} from '@/graphql/generated/types';
import {
  createFakerDataStore,
  EntityConfig,
  generateAuditTimestamps,
  updateAuditTimestamp,
} from '@/lib/providers/faker/genericDataStore';

// Generate initial organizations (hardcoded)
const generateInitialOrganizations = (): Organization[] => {
  const auditTimestamps = generateAuditTimestamps();
  return [
    {
      id: faker.string.uuid(),
      name: 'Acme Corporation',
      slug: 'acme-corporation',
      ...auditTimestamps,
    },
    {
      id: faker.string.uuid(),
      name: 'Beta Industries',
      slug: 'beta-industries',
      ...auditTimestamps,
    },
    {
      id: faker.string.uuid(),
      name: 'Gamma Technologies',
      slug: 'gamma-technologies',
      ...auditTimestamps,
    },
    {
      id: faker.string.uuid(),
      name: 'Delta Solutions',
      slug: 'delta-solutions',
      ...auditTimestamps,
    },
  ];
};

// Organizations-specific configuration
const organizationsConfig: EntityConfig<
  Organization,
  CreateOrganizationInput,
  UpdateOrganizationInput
> = {
  entityName: 'Organization',
  dataFileName: 'organizations.json',

  // Generate UUID for organization IDs
  generateId: () => faker.string.uuid(),

  // Generate organization entity from input
  generateEntity: (input: CreateOrganizationInput, id: string): Organization => {
    const auditTimestamps = generateAuditTimestamps();
    return {
      id,
      name: input.name,
      slug: input.name
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, ''),
      ...auditTimestamps,
    };
  },

  // Update organization entity
  updateEntity: (entity: Organization, input: UpdateOrganizationInput): Organization => {
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
  initialData: generateInitialOrganizations,
};

// Create the organizations data store instance
export const organizationsDataStore = createFakerDataStore(organizationsConfig);

// Export the main functions with the same interface as the original
export const initializeDataStore = () => organizationsDataStore.getEntities();

export const sortOrganizations = (
  organizations: Organization[],
  sortConfig?: OrganizationSortInput
): Organization[] => {
  if (!sortConfig) return organizations;

  return organizationsDataStore.getEntities({
    field: sortConfig.field,
    order: sortConfig.order,
  });
};

// Updated getOrganizations function with optional ids parameter
export const getOrganizations = (
  sortConfig?: OrganizationSortInput,
  ids?: string[]
): Organization[] => {
  let allOrganizations = organizationsDataStore.getEntities(
    sortConfig
      ? {
          field: sortConfig.field,
          order: sortConfig.order,
        }
      : undefined
  );

  // If ids are provided, filter by those IDs
  if (ids && ids.length > 0) {
    allOrganizations = allOrganizations.filter((organization) => ids.includes(organization.id));
  }

  return allOrganizations;
};

export const createOrganization = (input: CreateOrganizationInput): Organization => {
  return organizationsDataStore.createEntity(input);
};

export const updateOrganization = (
  organizationId: string,
  input: UpdateOrganizationInput
): Organization | null => {
  return organizationsDataStore.updateEntity(organizationId, input);
};

export const deleteOrganization = (organizationId: string): Organization | null => {
  return organizationsDataStore.deleteEntity(organizationId);
};
