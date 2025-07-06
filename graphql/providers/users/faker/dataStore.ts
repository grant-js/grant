import { faker } from '@faker-js/faker';
import { User, CreateUserInput, UpdateUserInput, UserSortInput } from '@/graphql/generated/types';
import { createFakerDataStore, EntityConfig } from '@/lib/providers/faker/genericDataStore';
import { getRoles } from '@/graphql/providers/roles/faker/dataStore';

// Generate fake users for initial data
const generateFakeUsers = (count: number = 50): User[] => {
  return Array.from({ length: count }, () => ({
    id: faker.string.uuid(),
    name: faker.person.fullName(),
    email: faker.internet.email(),
    roles: getRoles().filter(() => faker.datatype.boolean()),
  }));
};

// Users-specific configuration
const usersConfig: EntityConfig<User, CreateUserInput, UpdateUserInput> = {
  entityName: 'User',
  dataFileName: 'users.json',

  // Generate UUID for user IDs
  generateId: () => faker.string.uuid(),

  // Generate user entity from input
  generateEntity: (input: CreateUserInput, id: string): User => ({
    id,
    name: input.name,
    email: input.email,
    roles: getRoles().filter((role) => input.roleIds?.includes(role.id)) || [],
  }),

  // Update user entity
  updateEntity: (entity: User, input: UpdateUserInput): User => ({
    ...entity,
    name: input.name,
    email: input.email,
    roles: getRoles().filter((role) => input.roleIds?.includes(role.id)) || entity.roles,
  }),

  // Sortable fields
  sortableFields: ['name', 'email'],

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
export const saveUsers = (users: User[]) => {
  // This is handled internally by the data store
  // We keep this for backward compatibility but it's a no-op
};
export const sortUsers = (users: User[], sortConfig?: UserSortInput): User[] => {
  if (!sortConfig) return users;

  return usersDataStore.getEntities({
    field: sortConfig.field,
    order: sortConfig.order,
  });
};
export const getUsers = (sortConfig?: UserSortInput): User[] => {
  return usersDataStore.getEntities(
    sortConfig
      ? {
          field: sortConfig.field,
          order: sortConfig.order,
        }
      : undefined
  );
};
export const createUser = (input: CreateUserInput): User => {
  return usersDataStore.createEntity(input);
};
export const updateUser = (userId: string, input: UpdateUserInput): User | null => {
  return usersDataStore.updateEntity(userId, input);
};
export const deleteUser = (userId: string): User | null => {
  return usersDataStore.deleteEntity(userId);
};
