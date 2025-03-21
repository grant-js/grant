import { makeExecutableSchema } from '@graphql-tools/schema';
import { faker } from '@faker-js/faker';
import jwt from 'jsonwebtoken';

interface User {
  id: string;
  name: string;
  email: string;
  roles: Role[];
}

interface Role {
  id: string;
  label: string;
}

interface CreateUserInput {
  name: string;
  email: string;
  roleIds?: string[];
}

interface UpdateUserInput {
  name: string;
  email: string;
  roleIds?: string[];
}

interface LoginInput {
  email: string;
  password: string;
}

const JWT_SECRET = 'your-secret-key'; // In production, use an environment variable

// Define available roles
const ROLES: Role[] = [
  { id: 'admin', label: 'roles.admin' },
  { id: 'customer', label: 'roles.customer' },
];

const typeDefs = `#graphql
  type Role {
    id: ID!
    label: String!
  }

  type User {
    id: ID!
    name: String!
    email: String!
    roles: [Role!]!
  }

  type UserConnection {
    users: [User!]!
    totalCount: Int!
    hasNextPage: Boolean!
  }

  input CreateUserInput {
    name: String!
    email: String!
    roleIds: [ID!]
  }

  input UpdateUserInput {
    name: String!
    email: String!
    roleIds: [ID!]
  }

  input LoginInput {
    email: String!
    password: String!
  }

  type LoginResponse {
    token: String!
  }

  type Query {
    users(page: Int!, limit: Int!): UserConnection!
  }

  type Mutation {
    createUser(input: CreateUserInput!): User!
    updateUser(id: ID!, input: UpdateUserInput!): User!
    deleteUser(id: ID!): User!
    login(input: LoginInput!): LoginResponse!
  }
`;

// Generate 30 users with realistic names and emails
const users: User[] = Array.from({ length: 30 }, () => ({
  id: faker.string.uuid(),
  name: faker.person.fullName(),
  email: faker.internet.email(),
  roles: [{ id: 'customer', label: 'roles.customer' }], // Default role for all users
}));

const resolvers = {
  Query: {
    users: (_: unknown, { page, limit }: { page: number; limit: number }) => {
      const start = (page - 1) * limit;
      const end = start + limit;
      const paginatedUsers = users.slice(start, end);

      return {
        users: paginatedUsers,
        totalCount: users.length,
        hasNextPage: end < users.length,
      };
    },
  },
  Mutation: {
    createUser: (_: unknown, { input }: { input: CreateUserInput }): User => {
      const newUser = {
        id: faker.string.uuid(),
        ...input,
        roles: input.roleIds
          ?.map((id) => ROLES.find((role) => role.id === id))
          .filter((role): role is Role => role !== undefined) || [
          { id: 'customer', label: 'roles.customer' },
        ],
      };
      users.push(newUser);
      return newUser;
    },
    updateUser: (_: unknown, { id, input }: { id: string; input: UpdateUserInput }): User => {
      const userIndex = users.findIndex((user) => user.id === id);
      if (userIndex === -1) {
        throw new Error('User not found');
      }
      users[userIndex] = {
        ...users[userIndex],
        ...input,
        roles:
          input.roleIds
            ?.map((id) => ROLES.find((role) => role.id === id))
            .filter((role): role is Role => role !== undefined) || users[userIndex].roles,
      };
      return users[userIndex];
    },
    deleteUser: (_: unknown, { id }: { id: string }): User => {
      const userIndex = users.findIndex((user) => user.id === id);
      if (userIndex === -1) {
        throw new Error('User not found');
      }
      const [deletedUser] = users.splice(userIndex, 1);
      return deletedUser;
    },

    login: (_parent: unknown, args: { input: LoginInput }) => {
      // For demo purposes, we'll create a token that expires in 7 days
      const expiresIn = 7 * 24 * 60 * 60; // 7 days in seconds
      const token = jwt.sign(
        {
          sub: '1234567890', // In production, use the actual user ID
          email: args.input.email,
          exp: Math.floor(Date.now() / 1000) + expiresIn,
        },
        JWT_SECRET
      );

      return { token };
    },
  },
};

export const schema = makeExecutableSchema({
  typeDefs,
  resolvers,
});
