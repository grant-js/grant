# @logusgraphics/grant-schema

GraphQL schema and generated types for the Grant platform.

## Overview

This package contains:

- GraphQL schema definitions
- Generated TypeScript types
- GraphQL operations and resolvers
- Additional platform-specific types

## Installation

```bash
npm install @logusgraphics/grant-schema
```

## Usage

### Basic Types

```typescript
import { User, Role, Permission, Organization, Project } from '@logusgraphics/grant-schema';

const user: User = {
  id: '1',
  email: 'user@example.com',
  // ... other properties
};
```

### GraphQL Operations

```typescript
import { GetUsersQuery, CreateUserMutation } from '@logusgraphics/grant-schema';

// Use in your GraphQL operations
const GET_USERS = gql`
  query GetUsers {
    users {
      id
      email
      roles {
        id
        name
      }
    }
  }
`;
```

### Resolvers

```typescript
import { Resolvers } from '@logusgraphics/grant-schema';

const resolvers: Resolvers = {
  Query: {
    users: () => {
      // Your resolver implementation
    },
  },
};
```

## Development

### Generate Types

```bash
# Generate types from GraphQL schema
pnpm generate

# Watch for changes and regenerate
pnpm generate:watch
```

### Build Package

```bash
pnpm build
```

## Schema Structure

```
src/
├── schema/                    # GraphQL schema definitions
│   ├── permissions/          # Permission-related types and operations
│   ├── users/               # User-related types and operations
│   ├── roles/               # Role-related types and operations
│   ├── groups/              # Group-related types and operations
│   ├── organizations/       # Organization-related types and operations
│   ├── projects/            # Project-related types and operations
│   └── tags/                # Tag-related types and operations
├── generated/                # Generated TypeScript files
│   ├── types.ts             # Generated types
│   ├── operations.ts        # Generated operations
│   └── resolvers.ts         # Generated resolvers
└── types/                   # Additional TypeScript types
    └── index.ts             # Context and additional types
```

## Contributing

When modifying the GraphQL schema:

1. Update the relevant `.graphql` files in `src/schema/`
2. Run `pnpm generate` to regenerate types
3. Update any affected resolvers or operations
4. Test the changes

## License

MIT License - see [LICENSE](../../LICENSE) for details.
