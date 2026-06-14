# @grantjs/core

Core authorization engine for the Grant. This package provides the internal authorization logic used by `grant-api` to evaluate permissions, parse tokens, and evaluate conditions.

## Architecture

`grant-core` is the internal authorization engine that:

- Parses and validates JWT tokens
- Queries user permissions by unioning: Role → Group → Permission, User → Group → Permission, Role → Permission, and User → Permission
- Evaluates permission conditions with support for async resource resolution
- Provides a unified `Grant` class that orchestrates all components

## Components

### Core Classes

- **`Grant`** - Main authorization engine class
- **`TokenManager`** - JWT parsing, verification, validation, and signing (session + API key tokens)
- **`PermissionQueryEngine`** - Permission cascade querying
- **`ConditionEvaluator`** - Condition expression evaluation
- **`PermissionChecker`** - Permission matching with condition evaluation

### Types

All types are exported from this package, including:

- `TokenClaims`, `UserIdentity` - Token-related types
- `ConditionExpression`, `ComparisonOperator` - Condition evaluation types
- `ExecutionContext`, `ResourceResolver` - Context for condition evaluation
- `AuthorizationResult`, `QueryOptions` - Authorization result types

Types from `@grantjs/schema` (User, Role, Group, Permission, Resource, Scope, Tenant) are also re-exported for convenience.

## Usage (Internal - grant-api)

This package is designed to be used internally by `grant-api`. Here's how it would be integrated:

```typescript
import { Grant } from '@grantjs/core';
import type { GrantService } from '@grantjs/core';

// Implement GrantService (permissions, user/role/group lookup, session signing key, verification key)
const grantService: GrantService = { ... };

// Initialize Grant with the service
const grant = new Grant(grantService);

// Use in API endpoints
const result = await grant.isAuthorized(
  userId,
  scope,
  'policy', // resource slug
  'read', // action
  {
    user: { id: userId, metadata: userMetadata },
    resource: { id: 'POLICY-789', slug: 'policy' },
    resourceResolver: async (id, slug) => {
      // Resolve resource data from external system
      return await fetchPolicyData(id);
    },
    scope,
  }
);

if (result.authorized) {
  // Proceed with request
} else {
  // Return 403 Forbidden
}
```

## Condition Evaluation

The engine supports AWS IAM-inspired condition expressions:

```typescript
// Example condition: User can only access policies in their metadata
const condition = {
  in: {
    'resource.id': '{{user.metadata.policies}}',
  },
};

// Example condition: User can access policies from their partnerId
const condition = {
  'string-equals': {
    'user.metadata.partnerId': '{{resource.partnerId}}',
  },
};

// Complex condition with logical operators
const condition = {
  or: [
    { in: { 'resource.id': '{{user.metadata.policies}}' } },
    { 'string-equals': { 'user.metadata.partnerId': '{{resource.partnerId}}' } },
  ],
};
```

## Package Structure

```
grant-core/
├── src/
│   ├── core/
│   │   ├── grant.ts              # Main Grant class
│   │   ├── token-manager.ts      # JWT parse, verify, sign
│   │   ├── permission-query-engine.ts  # Permission queries
│   │   ├── condition-evaluator.ts      # Condition evaluation
│   │   ├── permission-checker.ts      # Permission checking
│   │   └── condition-schema.ts         # Zod schema for conditions
│   └── types/
│       └── index.ts              # Type definitions
```

## Dependencies

- `@grantjs/schema` - Types (User, Role, Group, Permission, Resource, Scope, etc.)
- `jsonwebtoken` - JWT parsing and validation
- `zod` - Schema validation for condition expressions

## Development

```bash
# Build
pnpm build

# Type check
pnpm type-check

# Lint
pnpm lint

# Test
pnpm test
```

## License

MIT License - see [LICENSE](./LICENSE) for details.
