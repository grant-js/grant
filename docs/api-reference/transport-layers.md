---
title: Transport Layers
description: Comparing REST and GraphQL APIs — when to use each, endpoint parity, and differences
---

# Transport Layers

Grant exposes two API transports that share the same backend (handlers, services, repositories):

| Transport   | Endpoint   | Documentation                                   |
| ----------- | ---------- | ----------------------------------------------- |
| **REST**    | `/api/*`   | [Swagger UI](http://localhost:4000/api-docs)    |
| **GraphQL** | `/graphql` | [Apollo Sandbox](http://localhost:4000/graphql) |

Both accept `Authorization: Bearer <token>` for authentication and use the same `scope: { tenant, id }` pattern for multi-tenancy.

## When to Use Which

| Use case                   | Recommended | Why                                      |
| -------------------------- | ----------- | ---------------------------------------- |
| OAuth flows (GitHub login) | REST        | Requires browser redirects               |
| CI/CD scripts, curl        | REST        | Simpler to call from shell               |
| Swagger exploration        | REST        | Interactive docs out of the box          |
| Token exchange (API keys)  | REST        | `POST /api/auth/token` is REST-only      |
| JWKS discovery             | REST        | Standard `.well-known` endpoint          |
| Web dashboard              | GraphQL     | Field selection, batching, Apollo Client |
| Complex nested queries     | GraphQL     | Query exactly the fields you need        |
| Code generation            | GraphQL     | Types from `@grantjs/schema` codegen     |

## Endpoint Parity

Most operations are available in both transports. A few are REST-only due to their nature (browser redirects, file downloads, well-known discovery). No operations are GraphQL-only.

### REST-Only Endpoints

| Endpoint                        | Purpose                                             |
| ------------------------------- | --------------------------------------------------- |
| `GET /api/auth/github`          | Initiate GitHub OAuth — redirects browser to GitHub |
| `GET /api/auth/github/callback` | Handle GitHub OAuth callback — redirect handler     |
| `POST /api/auth/cli-callback`   | Exchange one-time CLI code for session tokens       |
| `POST /api/auth/token`          | Exchange API key credentials for JWT                |
| `POST /api/auth/is-authorized`  | Authorization check (used by `@grantjs/server` SDK) |
| `GET /api/me/export`            | GDPR data export (returns file download)            |
| `GET /.well-known/jwks.json`    | JWKS public key discovery (+ scoped variants)       |
| `GET /api/signing-keys`         | List signing keys for a project                     |
| `POST /api/signing-keys/rotate` | Rotate a project signing key                        |

### Shared Operations

All CRUD operations for these resources are available in both REST and GraphQL:

Organizations, Projects, Users, Roles, Groups, Permissions, Resources, Tags, API Keys, Organization Invitations, Organization Members, **Webhook Subscriptions** (project-scoped), and **Me notifications / preferences**.

Authentication mutations (login, register, refresh, logout, verify email, password reset) are also available in both.

## Scoping

Both transports use the same scope model. The only difference is how scope is passed:

**REST** — Query parameters for reads, request body for writes:

```bash
# GET (query params)
GET /api/roles?scopeId=<orgId>:<projectId>&tenant=organizationProject

# POST (body)
POST /api/roles
{ "name": "Editor", "scope": { "tenant": "organizationProject", "id": "<orgId>:<projectId>" } }
```

**GraphQL** — Always in the `input` argument:

```graphql
mutation {
  createRole(
    input: { name: "Editor", scope: { tenant: organizationProject, id: "<orgId>:<projectId>" } }
  ) {
    id
    name
  }
}
```

## Authentication

Both transports accept the same JWT token:

```http
Authorization: Bearer <accessToken>
```

GraphQL additionally supports **cookie-based authentication** (`HttpOnly` refresh token cookie) for the web dashboard. The REST API uses the same cookie mechanism for browser-based sessions.

## Error Formats

Errors carry the same `code` values across both transports, but the response envelope differs:

**REST:**

```json
{
  "error": "User not found",
  "code": "NOT_FOUND"
}
```

**GraphQL:**

```json
{
  "data": null,
  "errors": [
    {
      "message": "User not found",
      "extensions": { "code": "NOT_FOUND" }
    }
  ]
}
```

See [Error Handling](/api-reference/error-handling) for the full reference.

## GraphQL Sandbox

In non-production environments, the GraphQL endpoint at `/graphql` serves the **Apollo Sandbox** — an embedded IDE for building and testing queries.

To authenticate in the sandbox:

1. Open `http://localhost:4000/graphql`
2. Click the **Headers** tab at the bottom
3. Add: `{ "Authorization": "Bearer <accessToken>" }`
4. Write and execute queries/mutations

::: info Introspection
Schema introspection is enabled by default in non-production environments (`APOLLO_INTROSPECTION=true`). It is automatically disabled in production.
:::

## GraphQL Operations

The GraphQL API provides queries and mutations covering the shared resources above (exact counts drift as the schema grows). Key operation groups:

| Group          | Queries                                                             | Mutations                                                                              |
| -------------- | ------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Authentication | `me`, `isAuthorized`                                                | `login`, `register`, `refreshSession`, `verifyEmail`, `resetPassword`, ...             |
| Organizations  | `organizations`, `organizationMembers`, `organizationInvitations`   | `createOrganization`, `inviteMember`, `acceptInvitation`, ...                          |
| Projects       | `projects`                                                          | `createProject`, `updateProject`, `deleteProject`                                      |
| RBAC           | `roles`, `groups`, `permissions`, `resources`                       | CRUD for each                                                                          |
| Users          | `users`                                                             | `createUser`, `updateUser`, `deleteUser`                                               |
| API Keys       | `apiKeys`, `signingKeys`                                            | `createApiKey`, `exchangeApiKey`, `rotateSigningKey`, ...                              |
| Webhooks       | `webhookSubscriptions`, `webhookSubscription`, `webhookDeliveries`  | `createWebhookSubscription`, `updateWebhookSubscription`, `replayWebhookDelivery`, ... |
| Tags           | `tags`                                                              | `createTag`, `updateTag`, `deleteTag`                                                  |
| Me             | `myUserSessions`, `myNotifications`, `myNotificationPreferences`, … | `changeMyPassword`, `markMyNotificationRead`, `setMyNotificationPreference`, …         |

The full schema is available via introspection or through the `@grantjs/schema` package.

---

**Related:**

- [REST API](/api-reference/rest-api) — Swagger UI, authentication walkthrough, endpoint reference
- [Error Handling](/api-reference/error-handling) — Error codes and status codes
- [Integration Guide](/integration/guide) — End-to-end REST tutorial
