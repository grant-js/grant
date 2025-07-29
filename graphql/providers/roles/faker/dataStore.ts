import { faker } from '@faker-js/faker';

import { CreateRoleInput, UpdateRoleInput, RoleSortInput } from '@/graphql/generated/types';
import { RoleData } from '@/graphql/providers/roles/types';
import {
  createFakerDataStore,
  EntityConfig,
  generateAuditTimestamps,
  updateAuditTimestamp,
} from '@/lib/providers/faker/genericDataStore';

// Generate initial roles (hardcoded)
const generateInitialRoles = (): RoleData[] => {
  const auditTimestamps = generateAuditTimestamps();
  return [
    {
      id: faker.string.uuid(),
      name: 'Admin',
      description: 'Admin role with all permission groups',
      ...auditTimestamps,
    },
    {
      id: faker.string.uuid(),
      name: 'Support',
      description: 'Support user with support permission groups',
      ...auditTimestamps,
    },
    {
      id: faker.string.uuid(),
      name: 'Partner',
      description: 'Partner user with partner permission groups',
      ...auditTimestamps,
    },
    {
      id: faker.string.uuid(),
      name: 'Customer',
      description: 'Customer tenant level with customer permission groups',
      ...auditTimestamps,
    },
  ];
};

// Roles-specific configuration
const rolesConfig: EntityConfig<RoleData, CreateRoleInput, UpdateRoleInput> = {
  entityName: 'Role',
  dataFileName: 'roles.json',

  // Generate UUID for role IDs
  generateId: () => faker.string.uuid(),

  // Generate role entity from input
  generateEntity: (input: CreateRoleInput, id: string): RoleData => {
    const auditTimestamps = generateAuditTimestamps();
    return {
      id,
      name: input.name,
      description: input.description || '',
      ...auditTimestamps,
    };
  },

  // Update role entity
  updateEntity: (entity: RoleData, input: UpdateRoleInput): RoleData => {
    const auditTimestamp = updateAuditTimestamp();
    return {
      ...entity,
      name: input.name || entity.name,
      description: input.description || entity.description,
      ...auditTimestamp,
    };
  },

  // Sortable fields
  sortableFields: ['name', 'createdAt', 'updatedAt'],

  // Validation rules
  validationRules: [
    { field: 'id', unique: true },
    { field: 'name', unique: true, required: true },
  ],

  // Initial data
  initialData: generateInitialRoles,
};

// Create the roles data store instance
export const rolesDataStore = createFakerDataStore(rolesConfig);

// Export the main functions with the same interface as the original
export const initializeDataStore = () => rolesDataStore.getEntities();
export const saveRoles = (roles: RoleData[]) => {
  // This is handled internally by the data store
  // We keep this for backward compatibility but it's a no-op
};
export const sortRoles = (roles: RoleData[], sortConfig?: RoleSortInput): RoleData[] => {
  if (!sortConfig) return roles;

  return rolesDataStore.getEntities({
    field: sortConfig.field,
    order: sortConfig.order,
  });
};

// Updated getRoles function with optional ids parameter
export const getRoles = (sortConfig?: RoleSortInput, ids?: string[]): RoleData[] => {
  let allRoles = rolesDataStore.getEntities(
    sortConfig
      ? {
          field: sortConfig.field,
          order: sortConfig.order,
        }
      : undefined
  );

  // If ids are provided, filter by those IDs
  if (ids && ids.length > 0) {
    allRoles = allRoles.filter((role) => ids.includes(role.id));
  }

  return allRoles;
};

export const isRoleUnique = (roleId: string): boolean => {
  return rolesDataStore.entityExists(roleId);
};

export const createRole = (input: CreateRoleInput): RoleData => {
  return rolesDataStore.createEntity(input);
};

export const updateRole = (roleId: string, input: UpdateRoleInput): RoleData | null => {
  return rolesDataStore.updateEntity(roleId, input);
};

export const deleteRole = (roleId: string): RoleData | null => {
  return rolesDataStore.deleteEntity(roleId);
};
