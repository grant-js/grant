---
title: API Keys
description: Client credentials for programmatic access to Grant
---

# API Keys

API keys let external services authenticate with Grant using client credentials. Each key is a `clientId` + `clientSecret` pair that can be exchanged for a short-lived JWT access token.

## Lifecycle

```bmermaid
sequenceDiagram
    participant Admin
    participant Grant as Grant API
    participant App as Your Service

    Admin->>Grant: Create API key (scope, role)
    Grant-->>Admin: clientId + clientSecret

    Note over Admin: Store credentials securely.<br/>The secret is shown only once.

    App->>Grant: POST /auth/token<br/>{clientId, clientSecret, scope}
    Grant-->>App: {accessToken, expiresIn}

    App->>Grant: Authorization: Bearer {accessToken}
    Grant-->>App: Authorized response
```

## Scoping

Every API key is created within a specific scope. The scope determines which project and tenant context the key operates in:

| Scope                   | Format of `scope.id`       | Use case                                           |
| ----------------------- | -------------------------- | -------------------------------------------------- |
| **ProjectUser**         | `projectId:userId`         | Key acts as a specific user within a project       |
| **AccountProject**      | `accountId:projectId`      | Key acts on behalf of a personal account's project |
| **OrganizationProject** | `organizationId:projectId` | Key acts on behalf of an organization's project    |

For `AccountProject` and `OrganizationProject` scopes, the key is also associated with a **role** that determines its permissions. If no role is specified at creation, the creating user's current role is used.

## Token Exchange

The primary integration point is the token exchange endpoint:

```bash
POST /auth/token
Content-Type: application/json

{
  "clientId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "clientSecret": "base64url-encoded-secret",
  "scope": {
    "tenant": "OrganizationProject",
    "id": "org-id:project-id"
  }
}
```

**Response:**

```json
{
  "accessToken": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6Ii4uLiJ9...",
  "expiresIn": 900
}
```

The returned token is a standard RS256 JWT signed with the project's JWKS signing key. It includes:

| Claim   | Value                                 |
| ------- | ------------------------------------- |
| `sub`   | User ID associated with the key       |
| `iss`   | JWKS issuer URL for the project scope |
| `aud`   | Grant instance URL                    |
| `jti`   | API key ID                            |
| `type`  | `ApiKey`                              |
| `scope` | The requested scope object            |
| `exp`   | Expiration timestamp                  |

External services can verify these tokens using the JWKS endpoint published at the issuer URL. See [Security > JWKS and Signing Keys](/architecture/security#jwks-and-signing-keys) for endpoint patterns.

**Project OAuth:** For user-in-the-loop flows (e.g. tenant SPAs), project apps use authorization-code + PKCE instead of API keys: users sign in, consent returns `?code=`, and `POST /api/auth/project/token` issues a project-scoped JWT (and a rotating refresh token). Tokens may have `type: projectApp` and a `scopes` claim when the app restricts permissions; see [Security > Project OAuth](/architecture/security#project-oauth).

## REST Endpoints

| Method   | Path                   | Permission      | Description                       |
| -------- | ---------------------- | --------------- | --------------------------------- |
| `GET`    | `/api-keys`            | `ApiKey:Query`  | List keys (paginated, searchable) |
| `POST`   | `/api-keys`            | `ApiKey:Create` | Create a new key                  |
| `POST`   | `/api-keys/:id/revoke` | `ApiKey:Revoke` | Revoke an active key              |
| `DELETE` | `/api-keys/:id`        | `ApiKey:Delete` | Soft- or hard-delete a key        |
| `POST`   | `/auth/token`          | —               | Exchange credentials for a JWT    |

The exchange endpoint (`/auth/token`) is not permission-guarded — it authenticates via the client credentials themselves.

## Exportable secrets (opt-in)

By default Grant keeps only a bcrypt hash of a key's `clientSecret`, so a secret can never be read back. A project can opt in to a different trade-off for the API keys of its project users: Grant then keeps an encrypted, exportable copy of the secret, so a receiver that mirrors Grant into another system can carry the key across. This section covers the opt-in itself. It changes nothing about how any key is created, hashed or exchanged yet: the flag is read by later parts of the feature.

- **The flag.** `Project.exportableApiKeySecrets` is a plain boolean on the project, `false` by default, readable by anyone who can read the project. It says nothing about any individual key.
- **Who flips it.** `setProjectExportableApiKeySecrets` (GraphQL) and `PUT /api/projects/{id}/exportable-api-key-secrets` (body `{ scope, enabled }`) require `Project:SetExportableApiKeySecrets`, held by Owner and Admin by default and not by Dev (see [RBAC](/architecture/rbac)). The scope must be the project scope the request is authorized in (`accountProject` or `organizationProject`), and for REST its project must be the one in the path.
- **Needs a key to turn on.** Enabling fails with a configuration error naming `API_KEY_EXPORTABLE_SECRET_ENCRYPTION_KEY` while that variable is not set, so a project never opts in on an installation that cannot encrypt the copy. Disabling never needs it. See [Configuration](/getting-started/configuration).
- **Audited.** Each change writes one row on the project audit log, `SET_EXPORTABLE_API_KEY_SECRETS`, with the old and new value and the acting user. Setting the value the project already has changes nothing and writes no row.
- **Nothing is back-filled.** Opting in does not recover the secret of a key that already exists: Grant never had it. Only keys created or rotated after the opt-in can have a copy.
- **Opting out deletes the copies.** Disabling the flag removes every exportable copy the project holds, in the same transaction, and the audit row records how many (`metadata.copiesDeleted`). No copy exists yet in this release, so the count is `0`; the deletion is added together with the copy.

## Security

- **Secret shown once** — the `clientSecret` is returned only at creation time. It is hashed with bcrypt before storage and cannot be retrieved again.
- **Revocation** — revoked keys are immediately rejected on **exchange**. Access JWTs already issued stay valid until `exp` (default 15 minutes). `Grant.getAuth` does not denylist `jti`. See [Security — Residual access JWT window](/architecture/security#residual-access-jwt-window).
- **Expiration** — keys can have an optional `expiresAt` date. Expired keys are rejected on exchange.
- **Audit logging** — all key operations (create, revoke, delete, exchange) are recorded in the audit log with scope metadata.
- **CDM replace** — unchanged BYOK secrets keep the existing `api_keys.id` and `clientId`. A changed secret rotates the stored hash in place. See [CDM import — replace API-key identity](/core-concepts/cdm-import-export#replace-api-key-identity).

---

**Related:**

- [Security > JWKS and Signing Keys](/architecture/security#jwks-and-signing-keys) — Token verification and key rotation
- [Resources](/core-concepts/resources) — API key resource actions
- [Events, Webhooks & Notifications](/core-concepts/events-webhooks-notifications) — `api_key.created` / `rotated` / `revoked`
- [RBAC System](/architecture/rbac) — Role-based permission evaluation
