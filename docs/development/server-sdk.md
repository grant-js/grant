---
title: Server SDK (@grantjs/server)
description: Protecting routes and checking permissions with the Grant server SDK
---

# Server SDK (@grantjs/server)

`@grantjs/server` is the server-side SDK for Grant. It calls the Grant API over REST (no GraphQL client) and provides framework integrations so you can protect routes and run permission checks with minimal code.

## Features

- **REST-based** – Uses `fetch`; no GraphQL client.
- **Token handling** – Reads token from Authorization header or cookies; optional refresh (e.g. session) with retry on 401.
- **Integrations** – Express and Fastify middleware; NestJS and Next.js support planned.
- **Scope** – Scope can come from headers, query, or body; custom resolver supported.
- **Resource resolvers** – Optional async resolver for condition evaluation (e.g. load resource by ID from your DB).
- **Typings** – Use project-specific `ResourceSlug` and `ResourceAction` (e.g. from `grant generate-types`) for type-safe resource/action strings.

## Installation

```bash
pnpm add @grantjs/server
# or
npm install @grantjs/server
```

## Quick usage (Express)

```typescript
import { GrantClient } from '@grantjs/server';
import { isGranted } from '@grantjs/server/express';

const grant = new GrantClient({ apiUrl: 'https://api.grant.com' });

// Protect a route: require resource + action (and optional scope)
app.get(
  '/organizations',
  isGranted(grant, { resource: 'Organization', action: 'Query' }),
  (req, res) => {
    /* ... */
  }
);

// With resource resolver for conditions (e.g. ownership)
app.patch(
  '/projects/:id',
  isGranted(grant, {
    resource: 'Project',
    action: 'Update',
    resourceResolver: async ({ resourceSlug, scope, request }) => {
      const projectId = (request as any).params.id;
      return getProjectById(projectId, scope); // { id, ownerId, ... }
    },
  }),
  (req, res) => {
    /* ... */
  }
);
```

## Quick usage (Fastify)

```typescript
import { grantPlugin, isGranted } from '@grantjs/server/fastify';

await fastify.register(grantPlugin, { apiUrl: 'https://api.grant.com' });

fastify.get(
  '/organizations',
  { preHandler: isGranted(fastify.grant, { resource: 'Organization', action: 'Query' }) },
  async (request, reply) => ({ organizations: [] })
);
```

## Typings from the CLI

For type-safe resource and action strings, generate project-scoped typings with the CLI and import them in your app:

```bash
grant generate-types -o ./src/grant-types.ts
```

```typescript
import { ResourceSlug, ResourceAction } from './grant-types';
import { isGranted } from '@grantjs/server/express';

isGranted(grant, {
  resource: ResourceSlug.Document, // type-checked
  action: ResourceAction.Update,
});
```

## Documentation

- **Package README:** [@grantjs/server](https://github.com/logusgraphics/grant/tree/main/packages/%40grantjs/server) – Installation, Express/Fastify examples, token and scope options, error handling.
- **API:** Authorization is performed via `POST /api/auth/is-authorized` (see [REST API](/api-reference/rest-api)).
- **API Keys:** For server-to-server or CLI, use [project-level or user-scoped API keys](/core-concepts/api-keys) and pass the exchanged token (e.g. in Authorization header).
