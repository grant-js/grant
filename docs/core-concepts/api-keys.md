---
title: API Keys
description: User-scoped and project-level API keys, scopes, and token exchange
---

# API Keys

Grant supports two kinds of API keys: **user-scoped** (bound to a project and user) and **project-level** (bound to an account or organization project with a role). Both use the same exchange endpoint and JWT shape; scope and authorization differ by tenant.

## Scopes and Tenants

API keys are created and exchanged with a **scope** that identifies the tenant and context:

| Tenant                                                                 | Scope ID format                  | Use case                                                                           |
| ---------------------------------------------------------------------- | -------------------------------- | ---------------------------------------------------------------------------------- |
| **AccountProject**                                                     | `accountId:projectId`            | Personal-account project; key impersonates an account role for that project only.  |
| **OrganizationProject**                                                | `organizationId:projectId`       | Organization project; key impersonates an organization role for that project only. |
| **AccountProjectUser** / **OrganizationProjectUser** / **ProjectUser** | Per-tenant (e.g. project + user) | External systems; token represents a specific user in a project.                   |

Project-level keys (**AccountProject**, **OrganizationProject**) do **not** represent a user. They impersonate a **parent-tenant role** (e.g. account owner, organization viewer) with **effective scope limited to that single project**. The key cannot access other projects or parent-tenant resources outside that project.

## Token Exchange

**Endpoint:** `POST /api/auth/token`

**Body:** `clientId`, `clientSecret`, and `scope` (object with `tenant` and `id` matching the key’s scope).

**Response:** `accessToken`, `expiresIn`. No refresh token for API keys.

The JWT includes `scope` (e.g. `accountProject:accountId:projectId`) and `jti` (API key ID). Authorization uses these to resolve the key’s role and enforce project-only access for project-level keys.

## Creating API Keys

- **User-scoped keys:** Created in the context of a project user; bound to that user and project.
- **Project-level keys:** Created with a **role** (e.g. `account_role_id` for AccountProject, `organization_role_id` for OrganizationProject). Only users who can create API keys in that scope (e.g. ApiKey.Create) can create them; they may only assign roles they can assign.

Project-level keys are stored in pivot tables (`account_project_api_keys`, `organization_project_api_keys`) linking the API key to the project and the chosen role.

## Security

- Secrets are hashed; never returned after creation.
- Keys can be revoked and (optionally) expired.
- Token `sub` for project-level keys is a sentinel (e.g. API key ID) for auditing; authorization is by scope + role from the pivot.

See [REST API - Authentication](/api-reference/rest-api#authentication) for request/response details and [RBAC/ACL](/architecture/rbac-acl) for permissions on API Key resources.
