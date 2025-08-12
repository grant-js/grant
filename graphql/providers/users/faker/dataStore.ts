import { faker } from '@faker-js/faker';

import { CreateUserInput, UpdateUserInput, User, UserSortInput } from '@/graphql/generated/types';
import {
  createFakerDataStore,
  EntityConfig,
  generateAuditTimestamps,
  updateAuditTimestamp,
} from '@/lib/providers/faker/genericDataStore';
const generateFakeUsers = (count: number = 50): User[] => {
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
const usersConfig: EntityConfig<User, CreateUserInput, UpdateUserInput> = {
  entityName: 'User',
  dataFileName: 'users.json',
  generateId: () => faker.string.uuid(),
  generateEntity: (input: CreateUserInput, id: string): User => {
    const auditTimestamps = generateAuditTimestamps();
    return {
      id,
      name: input.name,
      email: input.email,
      ...auditTimestamps,
    };
  },
  updateEntity: (entity: User, input: UpdateUserInput): User => {
    const auditTimestamp = updateAuditTimestamp();
    return {
      ...entity,
      name: input.name,
      email: input.email,
      ...auditTimestamp,
    };
  },
  sortableFields: ['name', 'email', 'createdAt', 'updatedAt'],
  validationRules: [
    { field: 'id', unique: true },
    { field: 'email', unique: true, required: true },
  ],
  initialData: generateFakeUsers,
};
export const usersDataStore = createFakerDataStore(usersConfig);
export const initializeDataStore = () => usersDataStore.getEntities();
export const sortUsers = (users: User[], sortConfig?: UserSortInput): User[] => {
  if (!sortConfig) return users;
  return usersDataStore.getEntities({
    field: sortConfig.field,
    order: sortConfig.order,
  });
};
export const getUsers = (sortConfig?: UserSortInput, ids?: string[]): User[] => {
  let allUsers = usersDataStore.getEntities(
    sortConfig
      ? {
          field: sortConfig.field,
          order: sortConfig.order,
        }
      : undefined
  );
  if (ids && ids.length > 0) {
    allUsers = allUsers.filter((user) => ids.includes(user.id));
  }
  return allUsers;
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
