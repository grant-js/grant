import { Role, CreateRoleInput, UpdateRoleInput, RoleSortInput } from '@/graphql/generated/types';
import { createFakerDataStore, EntityConfig } from '@/lib/providers/faker/genericDataStore';
import { slugifySafe } from '@/shared/lib/slugify';

// Generate initial roles (hardcoded)
const generateInitialRoles = (): Role[] => [
  {
    id: 'admin',
    name: 'Admin',
    description: 'Admin role with all permission groups',
    groups: [],
  },
  {
    id: 'support',
    name: 'Support',
    description: 'Support user with support permission groups',
    groups: [],
  },
  {
    id: 'partner',
    name: 'Partner',
    description: 'Partner user with partner permission groups',
    groups: [],
  },
  {
    id: 'customer',
    name: 'Customer',
    description: 'Customer tenant level with customer permission groups',
    groups: [],
  },
];

// Roles-specific configuration
const rolesConfig: EntityConfig<Role, CreateRoleInput, UpdateRoleInput> = {
  entityName: 'Role',
  dataFileName: 'roles.json',

  // Generate slugified ID from name
  generateId: (input: CreateRoleInput) => slugifySafe(input.name),

  // Generate role entity from input
  generateEntity: (input: CreateRoleInput, id: string): Role => ({
    id,
    name: input.name,
    description: input.description || '',
    groups: [],
  }),

  // Update role entity
  updateEntity: (entity: Role, input: UpdateRoleInput): Role => ({
    ...entity,
    name: input.name || entity.name,
    description: input.description || entity.description,
  }),

  // Sortable fields
  sortableFields: ['name'],

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
export const saveRoles = (roles: Role[]) => {
  // This is handled internally by the data store
  // We keep this for backward compatibility but it's a no-op
};
export const sortRoles = (roles: Role[], sortConfig?: RoleSortInput): Role[] => {
  if (!sortConfig) return roles;

  return rolesDataStore.getEntities({
    field: sortConfig.field,
    order: sortConfig.order,
  });
};
export const getRoles = (sortConfig?: RoleSortInput): Role[] => {
  return rolesDataStore.getEntities(
    sortConfig
      ? {
          field: sortConfig.field,
          order: sortConfig.order,
        }
      : undefined
  );
};
export const isRoleUnique = (roleId: string): boolean => {
  return !rolesDataStore.entityExists(roleId);
};
export const createRole = (input: CreateRoleInput): Role => {
  return rolesDataStore.createEntity(input);
};
export const updateRole = (roleId: string, input: UpdateRoleInput): Role | null => {
  return rolesDataStore.updateEntity(roleId, input);
};
export const deleteRole = (roleId: string): Role | null => {
  return rolesDataStore.deleteEntity(roleId);
};
