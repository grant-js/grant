---
title: Adding REST Endpoints
description: How to add new REST API endpoints with Zod validation and OpenAPI documentation
---

# Adding REST Endpoints

This guide walks through adding a new REST endpoint to the Grant API. The REST layer uses Express, Zod v4 for validation, and `@asteasolutions/zod-to-openapi` for automatic Swagger documentation.

## Directory Structure

```
apps/api/src/rest/
├── routes/          # Route definitions with RBAC guards
├── schemas/         # Zod validation schemas (request/response)
├── openapi/         # OpenAPI/Swagger registration (modular)
├── types/           # TypeScript type definitions
└── index.ts         # Router mounting
```

## Step-by-Step

### 1. Define Zod Schemas

Create `src/rest/schemas/{resource}.schemas.ts`:

::: warning
Always import `z` from `@/lib/zod-openapi.lib` — not from `'zod'` directly. The OpenAPI extensions require this wrapper.
:::

```typescript
import { z } from '@/lib/zod-openapi.lib';
import { createSuccessResponseSchema, scopeSchema } from './common.schemas';

export const myResourceSchema = z.object({
  id: z.string(),
  name: z.string(),
  createdAt: z.string(),
});

export const createMyResourceRequestSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  scope: scopeSchema,
});

export const createMyResourceResponseSchema = createSuccessResponseSchema(myResourceSchema);
```

Export from `src/rest/schemas/index.ts`.

### 2. Create Routes

Create `src/rest/routes/{resource}.routes.ts`. Use `validate()` for schema validation and `authorizeRestRoute()` for RBAC:

```typescript
import { ResourceAction, ResourceSlug } from '@grantjs/constants';
import { Router, Response } from 'express';

import { authorizeRestRoute } from '@/lib/authorization';
import { validate } from '@/middleware/validation.middleware';
import { createMyResourceRequestSchema } from '@/rest/schemas';
import { TypedRequest } from '@/rest/types';
import { sendSuccessResponse } from '@/rest/utils/response';
import { RequestContext } from '@/types';

export function createMyResourceRoutes(context: RequestContext) {
  const router = Router();

  router.post(
    '/',
    validate({ body: createMyResourceRequestSchema }),
    authorizeRestRoute({
      resource: ResourceSlug.MyResource,
      action: ResourceAction.Create,
    }),
    async (req: TypedRequest<{ body: typeof createMyResourceRequestSchema }>, res: Response) => {
      const result = await context.handlers.myResource.create({ input: req.body });
      sendSuccessResponse(res, result, 201);
    }
  );

  return router;
}
```

A route whose body or query names a `scope` must be mounted behind `authorizeRestRoute()`: the guard refuses a request whose scope differs from the one it was authorized in. `apps/api/tests/unit/lib/authorization/authorized-scope-coverage.test.ts` fails for a scoped route that is not guarded; a route that must take a scope without one is added to the allowlist in that test, with its reason.

Register in `src/rest/index.ts`:

```typescript
router.use('/my-resource', createMyResourceRoutes(context));
```

### 3. Register OpenAPI Documentation

Create `src/rest/openapi/{resource}.openapi.ts` and register all paths with the `OpenAPIRegistry`. Then register the module in `src/rest/openapi/config.openapi.ts`.

Each path registration includes: method, path, tags, summary, request schema, and response schemas for all status codes (200/201, 400, 401, 403, 404, 500).

### 4. Verify

```bash
cd apps/api && pnpm dev
# Open http://localhost:4000/api-docs to see your endpoint in Swagger UI
```

## Key Patterns

| Pattern                                    | Usage                                         |
| ------------------------------------------ | --------------------------------------------- |
| `validate({ body, query, params })`        | Zod schema validation middleware              |
| `authorizeRestRoute({ resource, action })` | RBAC permission guard                         |
| `requireEmailVerificationRest()`           | Require verified email for mutation endpoints |
| `sendSuccessResponse(res, data, status?)`  | Standard JSON response wrapper                |
| `TypedRequest<{ body, query, params }>`    | Typed Express request                         |

## Common Pitfalls

| Problem                                                  | Cause                      | Fix                                              |
| -------------------------------------------------------- | -------------------------- | ------------------------------------------------ |
| `Cannot read properties of undefined (reading 'parent')` | Importing `z` from `'zod'` | Import from `@/lib/zod-openapi.lib`              |
| `Expected 2-3 arguments, but got 1`                      | Zod v3 `z.record()` syntax | Use `z.record(z.string(), z.unknown())` (Zod v4) |
| `.errors` undefined on ZodError                          | Zod v4 renamed it          | Use `.issues` instead of `.errors`               |

---

**Related:**

- [REST API Reference](/api-reference/rest-api) — Consumer-facing API documentation
- [Development Guide](/contributing/guide) — Project structure and workflow
- [Testing](/contributing/testing) — Testing strategies
