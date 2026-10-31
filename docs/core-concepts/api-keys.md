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

### What a project key may carry, and who may manage it

A project API key never carries more than its creator can do in the key's project scope. At creation, every permission the key's role resolves to in that scope must be among the permissions the creator holds there; equality is allowed, so a key may do exactly what its creator can. A request that exceeds the creator is refused with `403` and nothing is stored.

The same rule applies when a key is rotated, revoked or deleted: the caller's permissions must cover the key's. It is the same for account and organization projects and does not depend on a role's name or level, so a role outside the standard roles is judged by the permissions it carries. A key with neither a role nor permissions can be managed by no one.

A machine-only permission, today `ProjectUser:ExportCredentials`, may also be carried by a key whose creator holds its gate permission (`ProjectUser:SetPassword`) without holding the permission itself. See [API keys are attenuated](/architecture/rbac#api-keys-are-attenuated).

## Token Exchange

The primary integration point is the token exchange endpoint:

```bash
POST /auth/token
Content-Type: application/json

{
  "clientId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "clientSecret": "base64url-encoded-secret, or standard base64 for an opted-in project-user key",
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

By default Grant keeps only a bcrypt hash of a key's `clientSecret`, so a secret can never be read back. A project can opt in to a different trade-off for the API keys of its project users: Grant then keeps an encrypted copy of the secret, so a receiver that mirrors Grant into another system can carry the key across. This section covers the opt-in, the copy, the fingerprint and the one call that reads the copy back, the [credential export](#exporting-the-secret). The decision and its trade-off are recorded in ADR 0013 (`decisions/0013-exportable-api-key-secrets.md`).

- **The flag.** `Project.exportableApiKeySecrets` is a plain boolean on the project, `false` by default, readable by anyone who can read the project. It says nothing about any individual key.
- **Who flips it.** `setProjectExportableApiKeySecrets` (GraphQL) and `PUT /api/projects/{id}/exportable-api-key-secrets` (body `{ scope, enabled }`) require `Project:SetExportableApiKeySecrets`, held by Owner and Admin by default and not by Dev (see [RBAC](/architecture/rbac)). The scope must be the project scope the request is authorized in (`accountProject` or `organizationProject`), and for REST its project must be the one in the path.
- **Needs a key to turn on.** Enabling fails with a configuration error naming `API_KEY_EXPORTABLE_SECRET_ENCRYPTION_KEY` while that variable is not set, so a project never opts in on an installation that cannot encrypt the copy. Disabling never needs it. See [Configuration](/getting-started/configuration).
- **Audited.** Each change writes one row on the project audit log, `SET_EXPORTABLE_API_KEY_SECRETS`, with the old and new value and the acting user. Setting the value the project already has changes nothing and writes no row.

### What is kept, and when

- **Create and rotate, for project-user keys only.** In a project that opted in, creating a key for a project user (a `ProjectUser`, `OrganizationProjectUser` or `AccountProjectUser` scope) or rotating one stores an AES-256-GCM encrypted copy of the new secret in `api_key_exportable_secrets`, one row per key, replaced in place on rotate. The previous secret is not kept. If the encryption key is not configured the call fails with a configuration error and no key is issued or rotated.
- **Account and organization-project keys, and every CDM import, never get a copy.** A CDM import holds the plaintext in the importing system and never writes a copy; a CDM rotate of a key that has one deletes it.
- **The copy never outlives its hash.** Revoking a key, deleting it (soft or hard), a CDM replace that deletes or rotates it, and opting the project out each delete the copy in the same transaction. Opting out deletes every copy of the project, and the audit row records how many (`metadata.copiesDeleted`). A copy, when present, decrypts to the secret the key's current hash verifies.
- **Nothing is back-filled.** Opting in does not recover the secret of a key that already exists: Grant never had it. Only keys created or rotated after the opt-in can have a copy.
- **Its own key.** The copy is encrypted under `API_KEY_EXPORTABLE_SECRET_ENCRYPTION_KEY`, resolved when it is needed and never logged. It is distinct from `AUTH_MFA_SECRET_ENCRYPTION_KEY` and `PROJECT_OAUTH_CONNECTION_ENCRYPTION_KEY` (a different key-derivation purpose as well), so rotating one does not touch the others. Like the OAuth key, a changed value makes the existing copies undecryptable; there is no re-wrap.

### Secret format

A key that Grant issues for a project user in a project that opted in has a secret of **64 random bytes in padded standard base64** (88 characters, for example `Zm9v…==`), not Grant's usual 43-character base64url form. One string then works in Grant's token exchange and in a system that decodes standard base64. Every other key keeps the 43-character form.

**bcrypt checks only the first 72 bytes of its input.** For an 88-character secret the hash covers the first 72 characters (54 bytes, 432 bits of entropy) and the last 16 characters are not verified by `POST /auth/token`. Grant does not pre-hash secrets before bcrypt, because that would change the verification of every secret an importer supplied (a BYOK secret may already be longer than 72 bytes). The unverified tail is not a weakness a caller can use: the 72 verified bytes remain far beyond guessing.

### Fingerprint

Grant stores, for every project-user key created, rotated or imported from this release on (opted in or not), `api_keys.client_secret_fingerprint`: the lowercase hex **SHA-256 of the secret string as issued** (the 43- or 88-character text the client received), never of the bcrypt hash. It is `null` for a key created before this release and not rotated since. A CDM import writes it for the keys it creates or rotates, and for a key a replace leaves unchanged that has none yet, because the import holds the plaintext; a key supplied only as a hash gets none. A holder of a secret can compare `sha256(secret)` with the fingerprint to see that a key changed, or that it holds the current secret, without any secret leaving Grant. Grant issues secrets of 32 or 64 random bytes, so the unsalted digest cannot be guessed offline; a secret chosen by an importer is only as strong as the importer made it.

The fingerprint is read through GraphQL only: `User.apiKeyCredentials`, resolved in the request's project scope for each member:

```graphql
query {
  users(
    scope: { tenant: OrganizationProject, id: "<organizationId>:<projectId>" }
    ids: ["<userId>"]
  ) {
    users {
      id
      apiKeyCredentials {
        apiKeyId
        clientId
        fingerprint
        exportable
        updatedAt
      }
    }
  }
}
```

It lists the member's live (not revoked, not deleted) project-user keys, oldest first, `[]` for a member with none. `exportable` says that an encrypted copy of the key's current secret exists. The field is `null`, never an error, outside an `OrganizationProject` / `AccountProject` scope and for a caller without `ProjectUser:ExportCredentials`, exactly like `User.passwordCredential`. It never returns a secret, a hash or a ciphertext.

### Exporting the secret

The copy is read back by one call, the credential export that already returns project password hashes, with a second kind: `exportProjectUserCredentials` (GraphQL) and `POST /api/users/credentials/export` (REST, `Cache-Control: no-store`). It requires `ProjectUser:ExportCredentials`, the same permission as for hashes, which no standard group holds: grant it to the role a receiver's API key carries. The scope is a project scope (`accountProject` or `organizationProject`) that the request is authorized in, every id in `userIds` must be a member of the project (a non-member fails the whole call), and a call is capped at one page of users.

```graphql
query {
  exportProjectUserCredentials(
    input: {
      scope: { tenant: OrganizationProject, id: "<organizationId>:<projectId>" }
      userIds: ["<userId>"]
      kinds: [API_KEY_SECRET]
    }
  ) {
    users {
      userId
      apiKeySecrets {
        apiKeyId
        clientId
        fingerprint
        secret
      }
    }
  }
}
```

- **Shape.** `apiKeySecrets` is `null` when the `API_KEY_SECRET` kind was not requested, `[]` for a member with no key, otherwise one entry per live (not revoked, not deleted) project-user key **of that project**, oldest first. `secret` is the plaintext, 88 characters of standard base64, for a key that has a copy; it is **`null` for a key without one** (created before the project opted in, created by a CDM import, or rotated by a CDM replace), so a receiver can tell "no key" from "no copy" without a second call. `fingerprint` is the SHA-256 of the secret as issued, stored beside it so a receiver can compare `sha256(secret)` with it; it is `null` for a key created before fingerprints existed and not rotated since. `PASSWORD` and `API_KEY_SECRET` can be requested together: the password and the keys of a member come back in one entry.
- **Audited.** A successful call writes one summary row on the project credential audit log (`action = 'export'`, with the number of users, the number of credentials and secrets returned, and the kinds) and **one row per exported secret on the API-key audit log** (`action = 'export'`, the key id, `performedBy` the caller, metadata `{ projectId, userId, kind }`). A key listed with `secret: null` exported nothing and has no row. All rows are written in the transaction of the export, so a failed audit write fails the call and no secret is returned. A caller that is an API key is attributed to the system user, with the key's id in the metadata, as for hashes. No row holds a secret, a hash or a ciphertext.
- **Where it is decrypted.** Only inside the export, for the members it names and the keys of that project, with `API_KEY_EXPORTABLE_SECRET_ENCRYPTION_KEY` resolved at that moment. The plaintext is never logged, cached, put in an event, a webhook, an audit row or an error. If the key is missing or a copy does not decrypt under it, the call fails with a configuration error that names the variable.
- **What a receiver does.** Subscribe to `api_key.created` and `api_key.rotated` for the project (the event names the key as `aggregate.id` and its owner as `grantsubjectuser`, and never carries a secret), read `User.apiKeyCredentials` to see which keys changed (`fingerprint`) and which are `exportable`, call the export for the members that changed, write the secrets into the other system (keeping the value it already holds in that system's grace slot, since Grant keeps no previous secret), and compare `sha256(secret)` with the exported `fingerprint`. Whether the other system accepts the string is the receiver's check, outside Grant; what Grant guarantees is that the exported string is the one its own `POST /auth/token` accepted.

## Security

- **Secret shown once** — the `clientSecret` is returned only at creation time (and at rotation). It is hashed with bcrypt before storage and cannot be retrieved again. The one exception is a project user's key in a project that [opted in to exportable secrets](#exportable-secrets-opt-in): Grant also keeps an encrypted copy of it, which only the audited [credential export](#exporting-the-secret) reads. Secrets of such keys are 88 characters of standard base64, and bcrypt verifies the first 72 bytes only.
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
