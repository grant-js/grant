export const typeDefs = `#graphql
  type Query {
    hello: String
    users: [User!]!
  }

  type User {
    id: ID!
    name: String!
    email: String!
  }
`;

export const resolvers = {
  Query: {
    hello: () => 'Hello from Apollo Server!',
    users: () => [
      { id: '1', name: 'John Doe', email: 'john@example.com' },
      { id: '2', name: 'Jane Doe', email: 'jane@example.com' },
    ],
  },
};
