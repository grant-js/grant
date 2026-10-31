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

### Two grant kinds: a role or a set of permissions

A project key (`AccountProject` or `OrganizationProject`) carries exactly one of two things, and what it carries is what the key is authorized to do in that project:

- **A role.** `roleId` names a standard role of the parent tenant (a standard organization role for an organization project, a standard account role for an account project). The key has what the role resolves to in that project. An account project key created with neither `roleId` nor `permissionIds` carries the creator's account role; an organization project key needs one of the two.
- **A set of permissions.** `permissionIds` lists the permissions the key carries instead of a role, at least one. The key is authorized by exactly those permissions in its own project (the rows are read through the key's link to that project, so they resolve nowhere else) and by nothing from any role. Permissions are named by id, because a permission row can carry a condition and custom permissions exist; `apiKeyAttachableGrants` returns them.

A request that names both, neither (organization project), an empty list or a permission that does not exist is refused with `400`. `permissionIds` is not accepted for a project-user key, which is the user and which a list could not narrow.

In the API, `ApiKey.role` is set for a role key and `ApiKey.permissions` for a permission key; the other is `null`.

```bash
curl -X POST "$GRANT_URL/api/api-keys" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{
    "name": "Reporting",
    "scope": { "tenant": "organizationProject", "id": "<organization-id>:<project-id>" },
    "permissionIds": ["<User:Query id>", "<ProjectSyncJob:Query id>"]
  }'
```

### What a project key may carry, and who may manage it

A project API key never carries more than its creator can do in the key's project scope. At creation, every permission the key's role resolves to in that scope must be among the permissions the creator holds there; equality is allowed, so a key may do exactly what its creator can. A request that exceeds the creator is refused with `403` and nothing is stored.

The same rule applies when a key is rotated, revoked or deleted: the caller's permissions must cover the key's. It is the same for account and organization projects. A role key carries only a standard role (a standard organization role for an organization project, a standard account role for an account project); any other role is refused. A key with neither a role nor permissions can be managed by no one.

A machine-only permission, today `ProjectUser:ExportCredentials`, may also be carried by a key whose creator holds its gate permission (`ProjectUser:SetPassword`) without holding the permission itself. See [API keys are attenuated](/architecture/rbac#api-keys-are-attenuated).

### What you may attach

`apiKeyAttachableGrants(scope)` (GraphQL) and `GET /api/api-keys/attachable-grants?tenant=&scopeId=` (REST) list what the caller may give a new key in a project scope, which is the one question the creation check answers:

- `permissions`: each permission the caller holds in the scope, plus each machine-only permission whose gate the caller holds, flagged `machineOnly: true`;
- `roles`: the standard roles of the parent tenant whose permissions the caller covers.

It requires `ApiKey:Create`, takes a project scope the request is authorized in, and is not paged (the catalogue is small). A custom role of the organization is never listed: a role key carries only a standard role, and a permission key is the way to carry anything else.

### Editing a key's permissions

`setApiKeyPermissions` (GraphQL) and `PUT /api/api-keys/{id}/permissions` (REST, body `{ scope, permissionIds }`) replace the permissions a key carries. They require `ApiKey:Update`, and:

- `permissionIds` is the complete set the key carries afterwards, and it may not be empty;
- the caller must cover the key as it is today, which is the rule for rotating, revoking and deleting it;
- each permission the call **adds** must be covered by the caller's own cohort (what `apiKeyAttachableGrants` lists), machine-only permissions included; permissions the call leaves out are removed, and removing is always allowed;
- applied to a **role key**, the call converts it: the role is cleared and the listed permissions are stored. The conversion is one way (a permission key never goes back to a role), and it is bounded by the caller's cohort, not by what the old role held;
- a revoked key is refused (`400`), and a key that is not in the named scope is not found (`404`).

The key keeps its id, client ID and secret, and nothing new is handed out. The change reaches the key's next request: the key's cached authorization results are dropped when the change commits, so a token issued before the edit follows the new set at once.

Each change leaves a trail. The key's audit log gets one `ADD_PERMISSION` or `REMOVE_PERMISSION` row per permission added or removed (the permission id, its resource and action, never a secret; a conversion names the role it came from) and one `UPDATE_API_KEY_PERMISSIONS` row of counts. A call that changes nothing writes no row and publishes nothing. One `api_key.updated` [event](./events-webhooks-notifications.md) is published per change: it names the key and the number of permissions before and after, and no permission. It is webhook-only and, like `api_key.deleted`, has no owning user.

Because an edit can widen a key after its consumer was vetted, watch `api_key.updated` in the projects that matter, and give `ApiKey:Update` only to the people who should be able to do it.

### A key for a receiver that mirrors Grant into another system

A receiver that mirrors a project into another system does three separate things: it **reads the project's state** (members with their roles, tags and password fingerprints, groups with their permissions, and permissions), it **writes credentials** into the other system by calling the credential export, and it **imports** a document into Grant as a CDM sync job. Give each function its own key with exactly the permissions it uses; a key's secret then reaches only that function's permissions, and each key can be rotated or revoked on its own.

All three keys are project keys that carry permissions instead of a role, every call names the key's own project scope, and each key exchanges its credentials at `POST /api/auth/token`.

**The state reader.** A GraphQL read of `users(scope:)` (with its nested `roles`, `tags` and `passwordCredential`), `groups(scope:)` (with nested `permissions`) and `permissions(scope:)`.

| Permission                      | What needs it                                                                                        | Where it is checked                                                          |
| ------------------------------- | ---------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `User:Query`                    | `users`; REST `GET /api/users`                                                                       | The `users` query guard                                                      |
| `Group:Query`                   | `groups`                                                                                             | The `groups` query guard                                                     |
| `Permission:Query`              | `permissions`                                                                                        | The `permissions` query guard                                                |
| `ProjectUser:ExportCredentials` | The `passwordCredential` field (`source`, `updatedAt`, `fingerprint`), only if the reader selects it | The field resolver: without the permission the field is `null`, not an error |

The nested fields check nothing of their own. `roles`, `tags` and a group's `permissions` are covered by the guard of the query that returned them; `passwordCredential` (and `apiKeyCredentials`) resolve to `null` unless the caller holds `ProjectUser:ExportCredentials`. A reader that does not select them does not need that permission. `User:Read` is needed only to read one member by id over REST (`GET /api/users/{id}`); the GraphQL queries above take `ids` and need the `Query` permissions alone.

The `organizationMembers` query is guarded by `OrganizationMember:Query`, but it accepts only an organization scope, and a project key can name only its own project scope (and cannot be exchanged for an organization scope), so a project key cannot call it. Read the members of a project through `users`.

**The writer.** `POST /api/users/credentials/export` (GraphQL `exportProjectUserCredentials`), which returns the password hashes and the exportable API-key secrets of the members it names (see [Exporting the secret](#exporting-the-secret)).

| Permission                      | What needs it                           | Where it is checked                                          |
| ------------------------------- | --------------------------------------- | ------------------------------------------------------------ |
| `ProjectUser:ExportCredentials` | The credential export, and nothing else | The route guard and the `exportProjectUserCredentials` guard |

It is a machine-only permission, so only a holder of `ProjectUser:SetPassword` (an Owner or Admin) can attach it (see [What a project key may carry](#what-a-project-key-may-carry-and-who-may-manage-it)). The user ids it exports come from the reader.

**The importer.** `POST /api/projects/{id}/sync/upload-url` and `POST /api/projects/{id}/sync/jobs` start an import (GraphQL `requestProjectSyncUploadUrl`, `startProjectSync`), and `GET /api/projects/{id}/sync/jobs/{jobId}` reads the job it started.

| Permission              | What needs it                                                                                       | Where it is checked                                                                                     |
| ----------------------- | --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `ProjectSyncJob:Update` | Requesting the upload URL and starting the job (also `POST .../sync/jobs/export` for an export job) | The route guards and the `requestProjectSyncUploadUrl`, `startProjectSync`, `startProjectExport` guards |
| `ProjectSyncJob:Query`  | Reading a job (`GET .../sync/jobs`, `.../sync/jobs/{jobId}`, its `/payload` and `/snapshot`)        | The route guards and the `projectSyncJob`, `projectSyncJobs` guards                                     |

An import is applied by the sync job's worker, not under the key's own permissions, so the importer needs no write permission on users, roles or permissions. The email and MFA steps that guard these operations for a signed-in person do not apply to a key.

A single key that carries the union of the three sets also works, but it is wider: whoever holds its secret can read the project's state, export its credentials and start imports. Prefer one key per function. Nothing here needs any `ApiKey:*` or `Project:*` permission.

An Owner or Admin creates the writer, and a reader that selects `passwordCredential`; a Dev can create a reader that does not and the importer, because those need only permissions a Dev already holds. First list what the caller may attach and pick the ids:

```graphql
query {
  apiKeyAttachableGrants(
    scope: { tenant: OrganizationProject, id: "<organizationId>:<projectId>" }
  ) {
    permissions {
      machineOnly
      permission {
        id
        action
        resource {
          slug
        }
      }
    }
  }
}
```

`ProjectUser:ExportCredentials` is in the list with `machineOnly: true` for an Owner or an Admin, and absent for a Dev. Then create each key with its ids and no role, for example the writer:

```bash
curl -X POST "$GRANT_URL/api/api-keys" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{
    "name": "Mirror writer",
    "scope": { "tenant": "organizationProject", "id": "<organization-id>:<project-id>" },
    "permissionIds": ["<ProjectUser:ExportCredentials id>"]
  }'
```

The response carries the `clientId` and the `clientSecret`, which is shown once. The receiver exchanges them at `POST /api/auth/token` with the same project scope, as for any key (see [Token Exchange](#token-exchange)), and calls Grant with the access token. A call refused with `403` needs a permission the key does not carry; an Owner or Admin adds it with `PUT /api/api-keys/{id}/permissions` (see [Editing a key's permissions](#editing-a-key-s-permissions)) and the key's next request follows. For an account project the call is the same with `accountProject` and an account scope id.

In the dashboard, an Owner or Admin creates the same key from the project's pages:

1. Open **API Keys** in the project's sidebar and choose **Create API Key**.
2. In **Create API key**, fill in **General**: a name, and optionally a description and an expiration.
3. In the **Authorization** card, choose **Scopes** ("The key can do only what the permissions you pick allow"). The **Scopes** card appears below it.
4. In the **Scopes** card, select the key's permissions. They are grouped by resource, each group with an **All actions** checkbox, and the search field (**Search permissions...**) narrows the list. `ProjectUser:ExportCredentials` carries the **Credentials only** badge, and the card lists only permissions you may attach.
5. Choose **Create** (it stays disabled until at least one permission is selected). The **API Key Created** dialog shows the **Client ID** and the **Client Secret** once: copy them (or **Download credentials**), then choose **I've Saved My Credentials**.

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

| Method   | Path                          | Permission      | Description                                  |
| -------- | ----------------------------- | --------------- | -------------------------------------------- |
| `GET`    | `/api-keys`                   | `ApiKey:Query`  | List keys (paginated, searchable)            |
| `POST`   | `/api-keys`                   | `ApiKey:Create` | Create a new key (a role or `permissionIds`) |
| `GET`    | `/api-keys/attachable-grants` | `ApiKey:Create` | List what the caller may give a project key  |
| `PUT`    | `/api-keys/:id/permissions`   | `ApiKey:Update` | Replace a project key's permissions          |
| `POST`   | `/api-keys/:id/revoke`        | `ApiKey:Revoke` | Revoke an active key                         |
| `DELETE` | `/api-keys/:id`               | `ApiKey:Delete` | Soft- or hard-delete a key                   |
| `POST`   | `/auth/token`                 | —               | Exchange credentials for a JWT               |

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

The copy is read back by one call, the credential export that already returns project password hashes, with a second kind: `exportProjectUserCredentials` (GraphQL) and `POST /api/users/credentials/export` (REST, `Cache-Control: no-store`). It requires `ProjectUser:ExportCredentials`, the same permission as for hashes, which no standard group holds: a holder of `ProjectUser:SetPassword` attaches it to the receiver's API key as a machine-only permission (see [What you may attach](#what-you-may-attach)). The scope is a project scope (`accountProject` or `organizationProject`) that the request is authorized in, every id in `userIds` must be a member of the project (a non-member fails the whole call), and a call is capped at one page of users.

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
