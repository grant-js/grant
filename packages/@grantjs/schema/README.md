# @grantjs/schema

GraphQL schema and generated types for the Grant.

## Overview

This package contains:

- GraphQL schema definitions
- Generated TypeScript types
- GraphQL operations and resolvers
- Additional platform-specific types

## Installation

```bash
npm install @grantjs/schema
```

## Usage

### Basic Types

```typescript
import { User, Role, Permission, Organization, Project } from '@grantjs/schema';

const user: User = {
  id: '1',
  email: 'user@example.com',
  // ... other properties
};
```

### GraphQL Operations

```typescript
import { GetUsersQuery, CreateUserMutation } from '@grantjs/schema';

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
import { Resolvers } from '@grantjs/schema';

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
pnpm dev
```

Generated output under `src/generated/` is committed and must stay in sync with its
sources. CI runs `pnpm codegen:check` (regenerate, fail on any diff), so edit the
`.graphql` files or `codegen.ts` — never `src/generated/` directly.

### Test

```bash
pnpm test
```

Structural assertions on the merged SDL: it builds, every operation document
validates against it, and the count of types unreachable from `Query`/`Mutation`
is pinned. See `src/sdl-contract.test.ts`.

### Build Package

```bash
pnpm build
```

## Schema Structure

```
src/
├── schema/                   # GraphQL SDL — one directory per domain, each with
│   │                         # inputs/, types/ and (where the domain is on the graph)
│   │                         # queries/ and mutations/
│   ├── base.graphql          # Scalars, shared interfaces, Tenant/SortOrder, Scope
│   └── root.graphql          # Query/Mutation roots the domains extend
├── operations/               # Client operation documents, one directory per domain
├── generated/                # Codegen output — committed, never hand-edited
│   ├── schema-types.ts       # Schema types (owns every type name)
│   ├── graphql.ts            # Operation types + typed document nodes
│   └── resolvers.ts          # Resolver types; imports from schema-types
├── events/                   # Event catalog and envelope types
├── cdm/, notifications/,     # Hand-written contract types that are not codegen'd
│   webhooks/
└── index.ts                  # Public barrel
```

`apps/api` loads every file under `src/schema/` into `makeExecutableSchema`, so
anything declared there ships in the served schema whether or not a query reaches it.

## Contributing

When modifying the GraphQL schema:

1. Update the relevant `.graphql` files in `src/schema/`
2. Run `pnpm generate` to regenerate types
3. Update any affected resolvers or operations
4. Test the changes

## License

MIT License - see [LICENSE](../../LICENSE) for details.
