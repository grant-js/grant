import fs from 'fs';
import path from 'path';
import { ApolloServerErrorCode } from '@apollo/server/errors';
import {
  Permission,
  CreatePermissionInput,
  PermissionSortableField,
  PermissionSortOrder,
  UpdatePermissionInput,
} from '@/graphql/generated/types';
import { slugifySafe } from '@/shared/lib/slugify';
import { ApiError } from '@/graphql/errors';

const DATA_FILE_PATH = path.join(process.cwd(), 'data', 'permissions.json');

// Ensure the data directory exists
const ensureDataDirectory = () => {
  const dataDir = path.dirname(DATA_FILE_PATH);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
};

// Generate initial permissions (hardcoded)
const generateInitialPermissions = (): Permission[] => [
  {
    id: 'get-policies',
    name: 'Get Policies',
    description: 'Permission to get policies',
  },
  {
    id: 'create-policy',
    name: 'Create Policy',
    description: 'Permission to create policies',
  },
  {
    id: 'update-policy',
    name: 'Update Policy',
    description: 'Permission to update policies',
  },
  {
    id: 'delete-policy',
    name: 'Delete Policy',
    description: 'Permission to delete policies',
  },
];

// Initialize or load the data store
export const initializeDataStore = (): Permission[] => {
  ensureDataDirectory();

  if (!fs.existsSync(DATA_FILE_PATH)) {
    const permissions = generateInitialPermissions();
    fs.writeFileSync(DATA_FILE_PATH, JSON.stringify(permissions, null, 2));
    return permissions;
  }

  const data = fs.readFileSync(DATA_FILE_PATH, 'utf-8');
  return JSON.parse(data);
};

// Save permissions to the data store
export const savePermissions = (permissions: Permission[]): void => {
  ensureDataDirectory();
  fs.writeFileSync(DATA_FILE_PATH, JSON.stringify(permissions, null, 2));
};

// Sort permissions based on configuration
export const sortPermissions = (
  permissions: Permission[],
  sortConfig?: { field: PermissionSortableField; order: PermissionSortOrder }
): Permission[] => {
  if (!sortConfig) return permissions;
  return [...permissions].sort((a, b) => {
    let aValue = a.name.toLowerCase();
    let bValue = b.name.toLowerCase();
    if (aValue === bValue) return 0;
    if (aValue === null || aValue === undefined) return 1;
    if (bValue === null || bValue === undefined) return -1;
    const comparison = aValue < bValue ? -1 : 1;
    return sortConfig.order === PermissionSortOrder.Asc ? comparison : -comparison;
  });
};

// Get all permissions from the data store with optional sorting
export const getPermissions = (sortConfig?: {
  field: PermissionSortableField;
  order: PermissionSortOrder;
}): Permission[] => {
  if (!fs.existsSync(DATA_FILE_PATH)) {
    return sortPermissions(initializeDataStore(), sortConfig);
  }
  const data = fs.readFileSync(DATA_FILE_PATH, 'utf-8');
  return sortPermissions(JSON.parse(data), sortConfig);
};

export const isPermissionUnique = (permissionId: string): boolean => {
  const permissions = getPermissions();
  return !permissions.some((permission) => permission.id === permissionId);
};

// Create a new permission in the data store
export const createPermission = (input: CreatePermissionInput): Permission => {
  const permissions = getPermissions();
  const id = slugifySafe(input.name);
  if (!isPermissionUnique(id)) {
    throw new ApiError(
      `Permission with id ${id} already exists`,
      ApolloServerErrorCode.BAD_REQUEST
    );
  }
  const newPermission: Permission = {
    id,
    name: input.name,
    description: input.description,
  };
  permissions.push(newPermission);
  savePermissions(permissions);
  return newPermission;
};

// Update a permission in the data store
export const updatePermission = (
  permissionId: string,
  input: UpdatePermissionInput
): Permission | null => {
  const permissions = getPermissions();
  const permissionIndex = permissions.findIndex((permission) => permission.id === permissionId);

  if (permissionIndex === -1) {
    return null;
  }

  let updatedPermission: Permission = {
    ...permissions[permissionIndex],
  };

  if (input.name) updatedPermission.name = input.name;
  if (input.description) updatedPermission.description = input.description;

  permissions[permissionIndex] = updatedPermission;
  savePermissions(permissions);
  return updatedPermission;
};

// Delete a permission from the data store
export const deletePermission = (permissionId: string): Permission | null => {
  const permissions = getPermissions();
  const permissionToDelete = permissions.find((permission) => permission.id === permissionId);

  if (!permissionToDelete) {
    return null;
  }

  const filteredPermissions = permissions.filter((permission) => permission.id !== permissionId);
  savePermissions(filteredPermissions);
  return permissionToDelete;
};
