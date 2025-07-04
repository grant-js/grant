import fs from 'fs';
import path from 'path';
import { faker } from '@faker-js/faker';
import {
  User,
  CreateUserInput,
  UserSortOrder,
  UserSortInput,
  UpdateUserInput,
} from '@/graphql/generated/types';
import { getRoles } from '@/graphql/resolvers/roles/providers/faker/dataStore';

const DATA_FILE_PATH = path.join(process.cwd(), 'data', 'users.json');

// Ensure the data directory exists
const ensureDataDirectory = () => {
  const dataDir = path.dirname(DATA_FILE_PATH);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
};

// Generate fake users
const generateFakeUsers = (count: number = 50): User[] => {
  return Array.from({ length: count }, () => ({
    id: faker.string.uuid(),
    name: faker.person.fullName(),
    email: faker.internet.email(),
    roles: getRoles().filter(() => faker.datatype.boolean()),
  }));
};

// Initialize or load the data store
export const initializeDataStore = (): User[] => {
  ensureDataDirectory();

  if (!fs.existsSync(DATA_FILE_PATH)) {
    const users = generateFakeUsers();
    fs.writeFileSync(DATA_FILE_PATH, JSON.stringify(users, null, 2));
    return users;
  }

  const data = fs.readFileSync(DATA_FILE_PATH, 'utf-8');
  return JSON.parse(data);
};

// Save users to the data store
export const saveUsers = (users: User[]): void => {
  ensureDataDirectory();
  fs.writeFileSync(DATA_FILE_PATH, JSON.stringify(users, null, 2));
};

// Sort users based on configuration
export const sortUsers = (users: User[], sortConfig?: UserSortInput): User[] => {
  if (!sortConfig) return users;

  return [...users].sort((a, b) => {
    const aValue = a[sortConfig.field];
    const bValue = b[sortConfig.field];

    if (aValue === bValue) return 0;
    if (aValue === null || aValue === undefined) return 1;
    if (bValue === null || bValue === undefined) return -1;

    const comparison = aValue < bValue ? -1 : 1;
    return sortConfig.order === UserSortOrder.Asc ? comparison : -comparison;
  });
};

// Get all users from the data store with optional sorting
export const getUsers = (sortConfig?: UserSortInput): User[] => {
  if (!fs.existsSync(DATA_FILE_PATH)) {
    return sortUsers(initializeDataStore(), sortConfig);
  }
  const data = fs.readFileSync(DATA_FILE_PATH, 'utf-8');
  return sortUsers(JSON.parse(data), sortConfig);
};

// Create a new user in the data store
export const createUser = (input: CreateUserInput): User => {
  const users = getUsers();
  const newUser: User = {
    id: faker.string.uuid(),
    name: input.name,
    email: input.email,
    roles: getRoles().filter((role) => input.roleIds?.includes(role.id)) || [],
  };

  users.push(newUser);
  saveUsers(users);
  return newUser;
};

// Update a user in the data store
export const updateUser = (userId: string, input: UpdateUserInput): User | null => {
  const users = getUsers();
  const userIndex = users.findIndex((user) => user.id === userId);

  if (userIndex === -1) {
    return null;
  }

  const roles = getRoles().filter((role) => input.roleIds?.includes(role.id)) || [];

  const updatedUser: User = {
    ...users[userIndex],
    name: input.name,
    email: input.email,
    roles,
  };

  users[userIndex] = updatedUser;
  saveUsers(users);
  return updatedUser;
};

// Delete a user from the data store
export const deleteUser = (userId: string): User | null => {
  const users = getUsers();
  const userToDelete = users.find((user) => user.id === userId);

  if (!userToDelete) {
    return null;
  }

  const filteredUsers = users.filter((user) => user.id !== userId);
  saveUsers(filteredUsers);
  return userToDelete;
};
