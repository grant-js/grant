import { faker } from '@faker-js/faker';

import { Auditable, Scope, Tenant } from '@/graphql/generated/types';
import { getRoles } from '@/graphql/providers/roles/faker/dataStore';
import { getUsers } from '@/graphql/providers/users/faker/dataStore';
import {
  createFakerDataStore,
  EntityConfig,
  generateAuditTimestamps,
} from '@/lib/providers/faker/genericDataStore';

import { getOrganizationRolesByOrganizationId } from '../../organization-roles/faker/dataStore';
import { getProjectRolesByProjectId } from '../../project-roles/faker/dataStore';

// Type for UserRole data without the resolved fields
export interface UserRoleData extends Auditable {
  userId: string;
  roleId: string;
}

// Input type for creating user-role relationships
export interface CreateUserRoleInput {
  userId: string;
  roleId: string;
}

// Generate fake user-role relationships
const generateFakeUserRoles = (count: number = 100): UserRoleData[] => {
  const users = getUsers();
  const roles = getRoles();

  const userRoles: UserRoleData[] = [];

  // Create some random user-role relationships
  for (let i = 0; i < count; i++) {
    const randomUser = users[Math.floor(Math.random() * users.length)];
    const randomRole = roles[Math.floor(Math.random() * roles.length)];

    // Avoid duplicates
    const exists = userRoles.some(
      (ur) => ur.userId === randomUser.id && ur.roleId === randomRole.id
    );
    if (!exists) {
      const auditTimestamps = generateAuditTimestamps();
      userRoles.push({
        id: faker.string.uuid(),
        userId: randomUser.id,
        roleId: randomRole.id,
        ...auditTimestamps,
      });
    }
  }

  return userRoles;
};

// UserRole-specific configuration
const userRoleConfig: EntityConfig<UserRoleData, CreateUserRoleInput, never> = {
  entityName: 'UserRole',
  dataFileName: 'user-roles.json',

  // Generate UUID for user-role IDs
  generateId: () => faker.string.uuid(),

  // Generate user-role entity from input
  generateEntity: (input: CreateUserRoleInput, id: string): UserRoleData => {
    const auditTimestamps = generateAuditTimestamps();
    return {
      id,
      userId: input.userId,
      roleId: input.roleId,
      ...auditTimestamps,
    };
  },

  // Update user-role entity (not used for this pivot)
  updateEntity: () => {
    throw new Error('UserRole entities should be updated through specific methods');
  },

  // Sortable fields
  sortableFields: ['userId', 'roleId', 'createdAt', 'updatedAt'],

  // Validation rules
  validationRules: [
    { field: 'id', unique: true },
    { field: 'userId', unique: false, required: true },
    { field: 'roleId', unique: false, required: true },
  ],

  // Initial data
  initialData: generateFakeUserRoles,
};

// Create the user-roles data store instance
export const userRolesDataStore = createFakerDataStore(userRoleConfig);

// Helper function to get role IDs based on scope
export const getUserRoleIdsByScope = (scope: Scope): string[] => {
  switch (scope.tenant) {
    case Tenant.Project:
      return getProjectRolesByProjectId(scope.id).map((pr) => pr.roleId);
    case Tenant.Organization:
      return getOrganizationRolesByOrganizationId(scope.id).map((or) => or.roleId);
    default:
      // For global scope, return all role IDs
      return getRoles().map((r) => r.id);
  }
};

// Helper functions for user-role operations
export const getUserRolesByUserId = (scope: Scope, userId: string): UserRoleData[] => {
  const userRoles = userRolesDataStore.getEntities().filter((ur) => ur.userId === userId);

  const scopedRoleIds = getUserRoleIdsByScope(scope);
  return userRoles.filter((ur) => scopedRoleIds.includes(ur.roleId));
};

export const getUserRolesByRoleId = (roleId: string): UserRoleData[] => {
  return userRolesDataStore.getEntities().filter((ur) => ur.roleId === roleId);
};

export const addUserRole = (userId: string, roleId: string): UserRoleData => {
  // Check if role already exists
  const existingRole = userRolesDataStore
    .getEntities()
    .find((ur) => ur.userId === userId && ur.roleId === roleId);

  if (existingRole) {
    return existingRole;
  }

  return userRolesDataStore.createEntity({ userId, roleId });
};

export const deleteUserRole = (id: string): UserRoleData | null => {
  return userRolesDataStore.deleteEntity(id);
};

export const deleteUserRoleByUserAndRole = (
  userId: string,
  roleId: string
): UserRoleData | null => {
  const userRole = userRolesDataStore
    .getEntities()
    .find((ur) => ur.userId === userId && ur.roleId === roleId);

  if (!userRole) {
    return null;
  }

  return userRolesDataStore.deleteEntity(userRole.id);
};

export const deleteUserRolesByUserId = (userId: string): UserRoleData[] => {
  const userRoles = userRolesDataStore.getEntities().filter((ur) => ur.userId === userId);
  userRoles.forEach((ur) => userRolesDataStore.deleteEntity(ur.id));
  return userRoles;
};

export const deleteUserRolesByRoleId = (roleId: string): UserRoleData[] => {
  const userRoles = userRolesDataStore.getEntities().filter((ur) => ur.roleId === roleId);
  userRoles.forEach((ur) => userRolesDataStore.deleteEntity(ur.id));
  return userRoles;
};
