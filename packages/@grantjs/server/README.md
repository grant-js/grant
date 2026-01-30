# @grantjs/server

Server SDK for Grant authorization platform. Provides middleware and guards for Express, Fastify, NestJS, and Next.js applications.

**Documentation:** [Server SDK](https://github.com/logusgraphics/grant/blob/main/docs/development/server-sdk.md) in the official docs.

## Features

- **REST-based API** - Uses native `fetch`, no GraphQL client required
- **Automatic token refresh** - Handles 401 errors with token refresh and retry
- **Framework integrations** - Express, Fastify, NestJS, Next.js middleware
- **Token extraction** - Supports Authorization header and cookies
- **Scope extraction** - Flexible scope resolution from headers, query params, or body
- **Resource resolvers** - Optional resource resolution for condition evaluation
- **TypeScript** - Full type safety with types from `@grantjs/schema`
- **Generic** - Works with any permission model (uses plain strings for resource/action)

## Installation

```bash
npm install @grantjs/server
# or
pnpm add @grantjs/server
# or
yarn add @grantjs/server
```

## Quick Start

### 1. Create the Client

```typescript
import { GrantClient } from '@grantjs/server';

// Basic configuration (uses Authorization header or cookies)
const grantClient = new GrantClient({
  apiUrl: 'https://api.grant.com',
});

// With cookie-based auth
const grantClient = new GrantClient({
  apiUrl: 'https://api.grant.com',
  cookieName: 'grant-access-token', // Default: 'grant-access-token'
});

// With custom token extraction
const grantClient = new GrantClient({
  apiUrl: 'https://api.grant.com',
  getToken: (request) => {
    // Custom logic to extract token from request
    const req = request as { headers?: { 'x-api-key'?: string } };
    return req.headers?.['x-api-key'] || null;
  },
});

// With token refresh support (recommended for session tokens)
const grantClient = new GrantClient({
  apiUrl: 'https://api.grant.com',
  getRefreshToken: (request) => {
    const req = request as { cookies?: { 'grant-refresh-token'?: string } };
    return req.cookies?.['grant-refresh-token'] || null;
  },
  onTokenRefresh: (tokens, request) => {
    // Update tokens in request/response
    const req = request as { headers?: Record<string, string> };
    if (req.headers) {
      req.headers['authorization'] = `Bearer ${tokens.accessToken}`;
    }
  },
  onUnauthorized: (request) => {
    // Handle unauthorized after refresh fails
    console.error('Authentication failed');
  },
});
```

### 2. Express Middleware

```typescript
import express from 'express';
import { grant } from '@grantjs/server/express';

const app = express();
const grantClient = new GrantClient({ apiUrl: 'https://api.grant.com' });

// Basic usage
app.get(
  '/organizations',
  grant(grantClient, {
    resource: 'Organization',
    action: 'Query',
  }),
  async (req, res) => {
    // User is authorized, proceed with handler
    res.json({ organizations: [] });
  }
);

// With resource resolver for condition evaluation
app.patch(
  '/projects/:id',
  grant(grantClient, {
    resource: 'Project',
    action: 'Update',
    resourceResolver: async ({ resourceSlug, scope, request }) => {
      // Resolve the project resource for condition evaluation
      const projectId = (request as any).params.id;
      const project = await getProjectById(projectId, scope);
      return project ? { id: project.id, ownerId: project.ownerId } : null;
    },
  }),
  async (req, res) => {
    // User is authorized, proceed with handler
    res.json({ success: true });
  }
);

// With custom scope resolver
app.get(
  '/users',
  grant(grantClient, {
    resource: 'User',
    action: 'Query',
    scopeResolver: async (request) => {
      // Custom logic to extract scope from request
      const orgId = (request as any).headers['x-organization-id'];
      return orgId ? { tenant: 'organization', id: orgId } : null;
    },
  }),
  async (req, res) => {
    res.json({ users: [] });
  }
);
```

### 3. Fastify Plugin

```typescript
import Fastify from 'fastify';
import { grantPlugin, grant } from '@grantjs/server/fastify';
import { GrantClient } from '@grantjs/server';

const fastify = Fastify();

// Register the plugin (decorates fastify.grant)
await fastify.register(grantPlugin, {
  apiUrl: 'https://api.grant.com',
  cookieName: 'grant-access-token',
});

// Use preHandler hook
fastify.get(
  '/organizations',
  {
    preHandler: grant(fastify.grant, {
      resource: 'Organization',
      action: 'Query',
    }),
  },
  async (request, reply) => {
    return { organizations: [] };
  }
);

// With resource resolver
fastify.patch(
  '/projects/:id',
  {
    preHandler: grant(fastify.grant, {
      resource: 'Project',
      action: 'Update',
      resourceResolver: async ({ resourceSlug, scope, request }) => {
        const projectId = (request.params as { id: string }).id;
        const project = await getProjectById(projectId, scope);
        return project ? { id: project.id, ownerId: project.ownerId } : null;
      },
    }),
  },
  async (request, reply) => {
    return { success: true };
  }
);

// With custom scope resolver
fastify.get(
  '/users',
  {
    preHandler: grant(fastify.grant, {
      resource: 'User',
      action: 'Query',
      scopeResolver: async (request) => {
        const orgId = (request.headers as { 'x-organization-id'?: string })['x-organization-id'];
        return orgId ? { tenant: 'organization', id: orgId } : null;
      },
    }),
  },
  async (request, reply) => {
    return { users: [] };
  }
);
```

## API Reference

### GrantClient

```typescript
const grantClient = new GrantClient(config: GrantServerConfig);
```

#### Configuration

```typescript
interface GrantServerConfig {
  // Required
  apiUrl: string;

  // Optional
  cookieName?: string; // Default: 'grant-access-token'
  getToken?: (request: unknown) => string | null | Promise<string | null>;
  getRefreshToken?: (request: unknown) => string | null | Promise<string | null>;
  onTokenRefresh?: (tokens: AuthTokens, request: unknown) => void | Promise<void>;
  onUnauthorized?: (request: unknown) => void | Promise<void>;
  fetch?: typeof fetch;
  credentials?: RequestCredentials;
}
```

#### Methods

```typescript
// Permission checks
grantClient.isGranted(resource, action, options?, request?): Promise<boolean>
grantClient.isAuthorized(resource, action, options?, request?): Promise<AuthorizationResult>

// Token extraction
grantClient.getTokenFromRequest(request): Promise<string | null>
```

### Express Middleware

#### `grant(client, options)`

Creates Express middleware that checks authorization before proceeding.

**Options:**

```typescript
interface GrantOptions {
  resource: string; // Resource slug (e.g., "Organization", "Project", "Document")
  action: string; // Action name (e.g., "Query", "Create", "Update", "Delete")
  scopeResolver?: ScopeResolver; // Custom scope extraction
  resourceResolver?: ResourceResolver; // Resource resolution for conditions
  scopeRequiredMessage?: string; // Custom error message
}
```

**Behavior:**

- Returns `401 Unauthorized` if no token is found
- Returns `400 Bad Request` if scope is required but missing
- Returns `404 Not Found` if resource resolver returns null
- Returns `403 Forbidden` if user lacks permission
- Calls `next()` if authorized
- Attaches `authorization` result to `req.authorization` for downstream use

### Fastify Plugin

#### `grantPlugin(fastify, options)`

Registers a Fastify plugin that decorates the instance with `fastify.grant` (GrantClient).

**Options:**

Same as `GrantServerConfig` - see [GrantClient Configuration](#grantclient) above.

**Usage:**

```typescript
await fastify.register(grantPlugin, {
  apiUrl: 'https://api.grant.com',
  cookieName: 'grant-access-token',
});

// Now fastify.grant is available
const canEdit = await fastify.grant.isGranted('Document', 'Update', { scope });
```

#### `grant(client, options)`

Creates a Fastify `preHandler` hook that checks authorization before proceeding.

**Options:**

Same as Express `GrantOptions` - see above.

**Behavior:**

- Returns `401 Unauthorized` if no token is found
- Returns `400 Bad Request` if scope is required but missing
- Returns `404 Not Found` if resource resolver returns null
- Returns `403 Forbidden` if user lacks permission
- Attaches `authorization` result to `request.authorization` for downstream use
- Continues to route handler if authorized
- Calls `next()` if authorized
- Attaches `authorization` result to `req.authorization` for downstream use

## Token Extraction

The client supports multiple token extraction methods (in order of precedence):

1. **Custom `getToken` function** (if provided)
2. **Authorization header**: `Authorization: Bearer <token>`
3. **Cookies**: Cookie named by `cookieName` config (default: `grant-access-token`)

## Scope Extraction

Scope can be extracted from:

1. **Headers**: `X-Scope-Tenant` and `X-Scope-Id`
2. **Query params**: `scopeId` and `tenant`, or `scope` object
3. **Request body**: `scope` property
4. **Custom resolver**: `scopeResolver` function in middleware options

## Resource Resolvers

Resource resolvers are optional functions that resolve resource data for condition evaluation:

```typescript
const resourceResolver: ResourceResolver = async ({ resourceSlug, scope, request }) => {
  // Fetch resource from database
  const resource = await getResource(resourceSlug, scope, request);

  // Return resource data for condition evaluation
  // e.g., { id: '...', ownerId: '...', status: 'active' }
  return resource ? { id: resource.id, ownerId: resource.ownerId } : null;
};
```

If the resolver returns `null`, the middleware returns `404 Not Found`.

## Error Handling

The package exports error classes for graceful error handling:

```typescript
import {
  AuthenticationError, // 401
  AuthorizationError, // 403
  BadRequestError, // 400
  NotFoundError, // 404
} from '@grantjs/server';

try {
  await grantClient.isAuthorized('resource', 'action', { scope }, request);
} catch (error) {
  if (error instanceof AuthenticationError) {
    // Handle 401
  } else if (error instanceof AuthorizationError) {
    // Handle 403
  }
}
```

## Token Refresh

The client supports automatic token refresh on 401 errors:

```typescript
const grantClient = new GrantClient({
  apiUrl: 'https://api.grant.com',
  getRefreshToken: async (request) => {
    return getRefreshTokenFromRequest(request);
  },
  onTokenRefresh: async (tokens, request) => {
    // Update tokens in request/response
    updateTokens(request, tokens);
  },
  onUnauthorized: async (request) => {
    // Handle after refresh fails
    redirectToLogin(request);
  },
});
```

## TypeScript

Full type definitions are included:

```typescript
import type {
  GrantServerConfig,
  AuthorizationResult,
  PermissionCheckOptions,
  Scope,
  ResourceResolver,
  ScopeResolver,
} from '@grantjs/server';

import { Tenant } from '@grantjs/schema';
```

## Comparison with @grantjs/client

The server package (`@grantjs/server`) is designed for **server-side** Node.js applications, while the client package (`@grantjs/client`) is for **browser** applications.

**Key Differences:**

| Feature               | @grantjs/server                             | @grantjs/client             |
| --------------------- | ------------------------------------------- | --------------------------- |
| **Target**            | Node.js servers                             | Browser apps                |
| **Caching**           | No (handled by API)                         | Yes (5min TTL)              |
| **Token Source**      | Request object                              | Callback functions          |
| **Framework Support** | Express, Fastify, NestJS, Next.js (planned) | React, Vue, Svelte, Angular |
| **API**               | `grant()` middleware/hook                   | `useGrant()` hook           |
| **Error Handling**    | HTTP status codes                           | Boolean returns             |
| **Resource/Action**   | Plain strings (generic)                     | Plain strings (generic)     |

**When to Use:**

- **@grantjs/server**: Protecting API routes, GraphQL resolvers, server-side middleware
- **@grantjs/client**: Conditional UI rendering, client-side permission checks

## License

MIT
