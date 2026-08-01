---
title: REST API
description: Interactive API documentation, authentication, and endpoint reference
---

# REST API

Grant exposes a full REST API at `/api/*` with interactive Swagger documentation. All endpoints use JSON and follow consistent request/response patterns.

## Swagger UI

The API ships with an interactive **Swagger UI** for exploring and testing every endpoint:

| Resource         | URL                                   |
| ---------------- | ------------------------------------- |
| **Swagger UI**   | `http://localhost:4000/api-docs`      |
| **OpenAPI JSON** | `http://localhost:4000/api-docs.json` |

Swagger UI includes request/response schemas, example payloads, and a "Try it out" button for every endpoint. The OpenAPI spec can be imported into Postman, Insomnia, or used to generate client SDKs.

### Authenticating in Swagger UI

Most endpoints require a JWT. Follow these steps to authenticate in the Swagger UI:

**1. Get a token** — Expand `POST /api/auth/login` under the Authentication tag, click "Try it out", and send:

```json
{
  "provider": "email",
  "providerId": "admin@example.com",
  "providerData": { "password": "YourPassword1!" }
}
```

**2. Copy the token** — From the response, copy the `accessToken` value.

**3. Authorize** — Click the **Authorize** button (lock icon) at the top of the page, paste the token into the `bearerAuth` field (without the `Bearer ` prefix), and click **Authorize**.

**4. Test endpoints** — All subsequent "Try it out" requests will include the token automatically.

::: tip Persist Authorization
Swagger UI is configured with `persistAuthorization: true` — your token survives page reloads until you click **Logout** in the Authorize dialog.
:::

## Base URL

```
http://localhost:4000/api
```

For production deployments, replace with your deployed API URL.

## Authentication

Include a JWT access token in the `Authorization` header:

```http
Authorization: Bearer <accessToken>
```

Obtain tokens via `POST /api/auth/login` (email/password) or `POST /api/auth/register` (new account). Refresh expired tokens with `POST /api/auth/refresh`.

### Authentication Flow

```bash
# 1. Login
curl -s -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"provider":"email","providerId":"admin@example.com","providerData":{"password":"YourPassword1!"}}'

# Response: { "success": true, "data": { "accessToken": "eyJ...", "refreshToken": "eyJ...", "accounts": [...] } }

# 2. Use the token
curl -s http://localhost:4000/api/organizations \
  -H "Authorization: Bearer <accessToken>" \
  -H "Content-Type: application/json"

# 3. Refresh when expired
curl -s -X POST http://localhost:4000/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"accessToken":"<expired>","refreshToken":"<refreshToken>"}'
```

## Endpoints by Tag

Every endpoint is fully documented in the Swagger UI. The table below links to each tag for quick navigation:

| Tag                                                                                    | Endpoints | Description                                                                        |
| -------------------------------------------------------------------------------------- | --------- | ---------------------------------------------------------------------------------- |
| [Authentication](http://localhost:4000/api-docs#/Authentication)                       | 10        | Login, register, refresh, logout, OAuth, token exchange, authorization check       |
| [Me](http://localhost:4000/api-docs#/Me)                                               | 17        | Profile, sessions, password, auth methods, notifications, preferences, data export |
| [Organizations](http://localhost:4000/api-docs#/Organizations)                         | 5         | CRUD for organizations                                                             |
| [Organization Invitations](http://localhost:4000/api-docs#/Organization%20Invitations) | 7         | Invite, accept, resend, renew, revoke                                              |
| [Organization Members](http://localhost:4000/api-docs#/Organization%20Members)         | 3         | List, update role, remove                                                          |
| [Projects](http://localhost:4000/api-docs#/Projects)                                   | 4         | CRUD for projects                                                                  |
| [Users](http://localhost:4000/api-docs#/Users)                                         | 5         | CRUD for users within a scope                                                      |
| [Roles](http://localhost:4000/api-docs#/Roles)                                         | 4         | CRUD for roles                                                                     |
| [Groups](http://localhost:4000/api-docs#/Groups)                                       | 4         | CRUD for groups (permission bundles)                                               |
| [Permissions](http://localhost:4000/api-docs#/Permissions)                             | 4         | CRUD for permissions                                                               |
| [Resources](http://localhost:4000/api-docs#/Resources)                                 | 4         | CRUD for resources (RBAC targets)                                                  |
| [API Keys](http://localhost:4000/api-docs#/API%20Keys)                                 | 5         | Create, list, revoke, delete, token exchange                                       |
| [Webhook Subscriptions](http://localhost:4000/api-docs#/Webhook%20Subscriptions)       | 8         | Project webhook CRUD, secret rotate, deliveries, replay                            |
| [Tags](http://localhost:4000/api-docs#/Tags)                                           | 4         | CRUD for tags                                                                      |

::: info REST-Only Endpoints
Some operations are only available via REST (not GraphQL):

- `GET /api/auth/github` — Initiate GitHub OAuth (browser redirect)
- `GET /api/auth/github/callback` — GitHub OAuth callback
- `POST /api/auth/cli-callback` — Exchange CLI one-time code for tokens
- `POST /api/auth/token` — Exchange API key for JWT
- `POST /api/auth/is-authorized` — Check authorization (used by SDKs)
- `GET /api/me/export` — GDPR data export (file download)
- `GET /.well-known/jwks.json` — JWKS public key discovery (3 scoped variants)

See [Transport Layers](/api-reference/transport-layers) for a full comparison.
:::

## Scoping and Multi-Tenancy

Most endpoints require a **scope** to specify the tenant context. The scope is passed differently depending on the HTTP method:

**GET / DELETE** — Query parameters:

```bash
GET /api/roles?scopeId=<orgId>:<projectId>&tenant=organizationProject
```

**POST / PATCH** — Request body:

```json
{
  "name": "Editor",
  "scope": { "tenant": "organizationProject", "id": "<orgId>:<projectId>" }
}
```

The `tenant` field indicates the level of the hierarchy. The `id` field is either a single UUID or two UUIDs joined by `:` (e.g., `orgId:projectId`).

| Tenant                | Scope ID format           | Example                |
| --------------------- | ------------------------- | ---------------------- |
| `account`             | `<accountId>`             | Personal account scope |
| `organization`        | `<orgId>`                 | Organization scope     |
| `accountProject`      | `<accountId>:<projectId>` | Personal project       |
| `organizationProject` | `<orgId>:<projectId>`     | Org project            |

::: tip
See [Multi-Tenancy](/architecture/multi-tenancy) for details on tenant isolation and the hierarchy model.
:::

## Response Format

**Success:**

```json
{
  "success": true,
  "data": { ... }
}
```

**Error:**

```json
{
  "error": "Localized error message",
  "code": "ERROR_CODE"
}
```

See [Error Handling](/api-reference/error-handling) for the full error reference.

## Field Selection

Load related entities on-demand with the `relations` query parameter:

```bash
GET /api/roles?scopeId=...&tenant=organizationProject&relations=groups,tags
```

Only base fields are returned by default. See [Field Selection](/advanced-topics/field-selection) for available relations per resource.

## Rate Limiting

Rate limits are configurable via environment variables (`SECURITY_RATE_LIMIT_*`). Auth endpoints have stricter limits than general endpoints. When a limit is exceeded, the API returns `429 Too Many Requests` with a `Retry-After` header. See [Configuration](/getting-started/configuration) for details.

---

**Related:**

- [Transport Layers](/api-reference/transport-layers) — REST vs GraphQL comparison
- [Error Handling](/api-reference/error-handling) — Error codes and status codes
- [Integration Guide](/integration/guide) — End-to-end tutorial
- [Server SDK](/integration/server-sdk) — Protect your routes with `@grantjs/server`
- [Client SDK](/integration/client-sdk) — Permission-based UI with `@grantjs/client`
