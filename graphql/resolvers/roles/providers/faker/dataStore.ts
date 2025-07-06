import fs from 'fs';
import path from 'path';
import { ApolloServerErrorCode } from '@apollo/server/errors';
import {
  Role,
  CreateRoleInput,
  RoleSortableField,
  RoleSortOrder,
  UpdateRoleInput,
} from '@/graphql/generated/types';
import { slugifySafe } from '@/shared/lib/slugify';
import { ApiError } from '@/graphql/errors';

const DATA_FILE_PATH = path.join(process.cwd(), 'data', 'roles.json');

// Ensure the data directory exists
const ensureDataDirectory = () => {
  const dataDir = path.dirname(DATA_FILE_PATH);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
};

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

// Initialize or load the data store
export const initializeDataStore = (): Role[] => {
  ensureDataDirectory();

  if (!fs.existsSync(DATA_FILE_PATH)) {
    const roles = generateInitialRoles();
    fs.writeFileSync(DATA_FILE_PATH, JSON.stringify(roles, null, 2));
    return roles;
  }

  const data = fs.readFileSync(DATA_FILE_PATH, 'utf-8');
  return JSON.parse(data);
};

// Save roles to the data store
export const saveRoles = (roles: Role[]): void => {
  ensureDataDirectory();
  fs.writeFileSync(DATA_FILE_PATH, JSON.stringify(roles, null, 2));
};

// Sort roles based on configuration
export const sortRoles = (
  roles: Role[],
  sortConfig?: { field: RoleSortableField; order: RoleSortOrder }
): Role[] => {
  if (!sortConfig) return roles;
  return [...roles].sort((a, b) => {
    let aValue = a.name.toLowerCase();
    let bValue = b.name.toLowerCase();
    if (aValue === bValue) return 0;
    if (aValue === null || aValue === undefined) return 1;
    if (bValue === null || bValue === undefined) return -1;
    const comparison = aValue < bValue ? -1 : 1;
    return sortConfig.order === RoleSortOrder.Asc ? comparison : -comparison;
  });
};

// Get all roles from the data store with optional sorting
export const getRoles = (sortConfig?: {
  field: RoleSortableField;
  order: RoleSortOrder;
}): Role[] => {
  if (!fs.existsSync(DATA_FILE_PATH)) {
    return sortRoles(initializeDataStore(), sortConfig);
  }
  const data = fs.readFileSync(DATA_FILE_PATH, 'utf-8');
  return sortRoles(JSON.parse(data), sortConfig);
};

export const isRoleUnique = (roleId: string): boolean => {
  const roles = getRoles();
  return !roles.some((role) => role.id === roleId);
};

// Create a new role in the data store
export const createRole = (input: CreateRoleInput): Role => {
  const roles = getRoles();
  const id = slugifySafe(input.name);
  if (!isRoleUnique(id)) {
    throw new ApiError(`Role with id ${id} already exists`, ApolloServerErrorCode.BAD_REQUEST);
  }
  const newRole: Role = {
    id,
    name: input.name,
    description: input.description,
    groups: [],
  };
  roles.push(newRole);
  saveRoles(roles);
  return newRole;
};

// Update a role in the data store
export const updateRole = (roleId: string, input: UpdateRoleInput): Role | null => {
  const roles = getRoles();
  const roleIndex = roles.findIndex((role) => role.id === roleId);

  if (roleIndex === -1) {
    return null;
  }

  let updatedRole: Role = {
    ...roles[roleIndex],
  };

  if (input.name) updatedRole.name = input.name;
  if (input.description) updatedRole.description = input.description;

  roles[roleIndex] = updatedRole;
  saveRoles(roles);
  return updatedRole;
};

// Delete a role from the data store
export const deleteRole = (roleId: string): Role | null => {
  const roles = getRoles();
  const roleToDelete = roles.find((role) => role.id === roleId);

  if (!roleToDelete) {
    return null;
  }

  const filteredRoles = roles.filter((role) => role.id !== roleId);
  saveRoles(filteredRoles);
  return roleToDelete;
};
