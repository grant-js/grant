import { faker } from '@faker-js/faker';
import { createFakerDataStore, EntityConfig } from '@/lib/providers/faker/genericDataStore';
import { getUsers } from '@/graphql/providers/users/faker/dataStore';
import { getRoles } from '@/graphql/providers/roles/faker/dataStore';

// Type for UserRole data without the resolved fields
export interface UserRoleData {
  id: string;
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
      userRoles.push({
        id: faker.string.uuid(),
        userId: randomUser.id,
        roleId: randomRole.id,
      });
    }
  }

  return userRoles;
};

// UserRole-specific configuration
const userRoleConfig: EntityConfig<UserRoleData, never, never> = {
  entityName: 'UserRole',
  dataFileName: 'user-roles.json',

  // Generate UUID for user-role IDs
  generateId: () => faker.string.uuid(),

  // Generate user-role entity from input (not used for this pivot)
  generateEntity: () => {
    throw new Error('UserRole entities should be created through specific methods');
  },

  // Update user-role entity (not used for this pivot)
  updateEntity: () => {
    throw new Error('UserRole entities should be updated through specific methods');
  },

  // Sortable fields
  sortableFields: ['userId', 'roleId'],

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

// Helper functions for user-role operations
export const getUserRolesByUserId = (userId: string): UserRoleData[] => {
  return userRolesDataStore.getEntities().filter((ur) => ur.userId === userId);
};

export const getUserRolesByRoleId = (roleId: string): UserRoleData[] => {
  return userRolesDataStore.getEntities().filter((ur) => ur.roleId === roleId);
};

export const addUserRole = (userId: string, roleId: string): UserRoleData => {
  // Get current entities and check if role already exists
  const entities = userRolesDataStore.getEntities();
  const existingRole = entities.find((ur) => ur.userId === userId && ur.roleId === roleId);

  if (existingRole) {
    return existingRole;
  }

  const userRole: UserRoleData = {
    id: faker.string.uuid(),
    userId,
    roleId,
  };

  entities.push(userRole);

  // Save back to the data store
  const fs = require('fs');
  const path = require('path');
  const dataFilePath = path.join(process.cwd(), 'data', 'user-roles.json');
  fs.writeFileSync(dataFilePath, JSON.stringify(entities, null, 2));

  return userRole;
};

export const deleteUserRole = (id: string): UserRoleData | null => {
  return userRolesDataStore.deleteEntity(id);
};

// New function to delete by userId and roleId
export const deleteUserRoleByUserAndRole = (
  userId: string,
  roleId: string
): UserRoleData | null => {
  const entities = userRolesDataStore.getEntities();
  const userRoleIndex = entities.findIndex((ur) => ur.userId === userId && ur.roleId === roleId);

  if (userRoleIndex === -1) {
    return null;
  }

  const userRole = entities[userRoleIndex];
  entities.splice(userRoleIndex, 1);

  // Save back to the data store
  const fs = require('fs');
  const path = require('path');
  const dataFilePath = path.join(process.cwd(), 'data', 'user-roles.json');
  fs.writeFileSync(dataFilePath, JSON.stringify(entities, null, 2));

  return userRole;
};

export const deleteUserRolesByUserId = (userId: string): UserRoleData[] => {
  const userRoles = getUserRolesByUserId(userId);
  return userRoles
    .map((ur) => userRolesDataStore.deleteEntity(ur.id))
    .filter(Boolean) as UserRoleData[];
};

export const deleteUserRolesByRoleId = (roleId: string): UserRoleData[] => {
  const userRoles = getUserRolesByRoleId(roleId);
  return userRoles
    .map((ur) => userRolesDataStore.deleteEntity(ur.id))
    .filter(Boolean) as UserRoleData[];
};
