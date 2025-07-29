import { faker } from '@faker-js/faker';

import { CreateUserInput, UpdateUserInput, UserSortInput } from '@/graphql/generated/types';
import { UserData } from '@/graphql/providers/users/types';
import {
  createFakerDataStore,
  EntityConfig,
  generateAuditTimestamps,
  updateAuditTimestamp,
} from '@/lib/providers/faker/genericDataStore';

// Generate fake users for initial data
const generateFakeUsers = (count: number = 50): UserData[] => {
  return Array.from({ length: count }, () => {
    const auditTimestamps = generateAuditTimestamps();
    return {
      id: faker.string.uuid(),
      name: faker.person.fullName(),
      email: faker.internet.email(),
      ...auditTimestamps,
    };
  });
};

// Users-specific configuration
const usersConfig: EntityConfig<UserData, CreateUserInput, UpdateUserInput> = {
  entityName: 'User',
  dataFileName: 'users.json',

  // Generate UUID for user IDs
  generateId: () => faker.string.uuid(),

  // Generate user entity from input
  generateEntity: (input: CreateUserInput, id: string): UserData => {
    const auditTimestamps = generateAuditTimestamps();
    return {
      id,
      name: input.name,
      email: input.email,
      ...auditTimestamps,
    };
  },

  // Update user entity
  updateEntity: (entity: UserData, input: UpdateUserInput): UserData => {
    const auditTimestamp = updateAuditTimestamp();
    return {
      ...entity,
      name: input.name,
      email: input.email,
      ...auditTimestamp,
    };
  },

  // Sortable fields
  sortableFields: ['name', 'email', 'createdAt', 'updatedAt'],

  // Validation rules
  validationRules: [
    { field: 'id', unique: true },
    { field: 'email', unique: true, required: true },
  ],

  // Initial data
  initialData: generateFakeUsers,
};

// Create the users data store instance
export const usersDataStore = createFakerDataStore(usersConfig);

// Export the main functions with the same interface as the original
export const initializeDataStore = () => usersDataStore.getEntities();
export const saveUsers = (users: UserData[]) => {
  // This is handled internally by the data store
  // We keep this for backward compatibility but it's a no-op
};
export const sortUsers = (users: UserData[], sortConfig?: UserSortInput): UserData[] => {
  if (!sortConfig) return users;

  return usersDataStore.getEntities({
    field: sortConfig.field,
    order: sortConfig.order,
  });
};
export const getUsers = (sortConfig?: UserSortInput, ids?: string[]): UserData[] => {
  let allUsers = usersDataStore.getEntities(
    sortConfig
      ? {
          field: sortConfig.field,
          order: sortConfig.order,
        }
      : undefined
  );

  // If ids are provided, filter by those IDs
  if (ids && ids.length > 0) {
    allUsers = allUsers.filter((user) => ids.includes(user.id));
  }

  return allUsers;
};
export const createUser = (input: CreateUserInput): UserData => {
  return usersDataStore.createEntity(input);
};
export const updateUser = (userId: string, input: UpdateUserInput): UserData | null => {
  return usersDataStore.updateEntity(userId, input);
};
export const deleteUser = (userId: string): UserData | null => {
  return usersDataStore.deleteEntity(userId);
};
