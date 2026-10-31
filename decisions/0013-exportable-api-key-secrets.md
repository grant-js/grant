# 0013 — Exportable API-key secrets: a reversible copy behind a per-project opt-in

- **Status**: Proposed
- **Date**: 2026-10-30
- **Context**: story `exportable-api-key-secret` (plans `2026-10-30-exportable-api-key-secret-*.md`); the three slice pull requests [#672](https://github.com/grant-js/grant/pull/672) (the opt-in), [#673](https://github.com/grant-js/grant/pull/673) (the encrypted copy, the 88-character form, the fingerprint) and the export slice that carries this record
- **Related**: [API keys](/core-concepts/api-keys#exportable-secrets-opt-in), [RBAC](/architecture/rbac), ADR [0004](./0004-secret-resolution-through-a-port.md) (keys resolve at point of use), [0008](./0008-per-project-oauth-connections.md) (the encryption primitive and the dedicated-key rule), [0011](./0011-password-as-a-scoped-credential.md) § 3 to § 5 (the permission precedent, the credential export and its fingerprint)
- **Scope**: project-user API keys only. Account and organization-project keys, every CDM import path, and every project that did not opt in are unchanged.
- **Compatibility**: additive. The default is off, nothing is back-filled, and no existing field, route or permission changes meaning. One new route (`PUT /api/projects/{id}/exportable-api-key-secrets`), one new permission action, one new `CredentialKind` member, new fields, two migrations, one new environment variable. Minor release.

## Context

An API key's `clientSecret` is generated once, hashed with bcrypt, and returned once, at create and at rotate (`apps/api/src/services/api-keys.service.ts:312-358`, `:796-835`). After that Grant holds only the hash (`client_secret_hash`), so a secret can never be read back by anyone, including the operator. That is the property a reader of `docs/core-concepts/api-keys.md` could rely on before this record.

A receiver that mirrors Grant into another system cannot live with it. When a project user's key is created or rotated in Grant, the receiver has to put the same secret into the other system, and a hash is no use there: the other system needs the plaintext (it stores it, and verifies a signature computed over it). The receiver already has an audited, permission-gated path for the same problem with passwords: the credential export of ADR 0011 § 4, whose `kinds` enum was built so that "a later credential type is a new kind and not a second export" (`decisions/0011-password-as-a-scoped-credential.md:669-673`). A password hash can leave Grant because the hash is what the other system stores. An API-key secret cannot, because Grant never kept it.

So the question is not how to export a secret but whether Grant may keep one reversibly, for whom, and under what controls. It is a boundary move: Grant today stores no credential in a form that can be turned back into the credential.

## Decision

**A project may opt in to keeping an encrypted copy of the secret of its project users' API keys. The copy is read through the existing credential export, as a second kind. Everything else about API-key secrets stays as it was.**

### 1. Reversible storage, and why it is acceptable only behind the opt-in

When a project opted in, creating or rotating a project-user key stores an **AES-256-GCM** copy of the new secret in `api_key_exportable_secrets` (`api_key_id` unique, `project_id`, `encrypted_secret`, `secret_iv`, `secret_tag`; foreign keys cascading from `api_keys` and `projects`; the same project row-level-security pair as the sibling pivots; migration `0095`). One row per key, replaced in place on rotate. **No previous secret is kept**: the receiver wrote it into its own system when it first exported it, Grant's token exchange never accepts a superseded secret, and keeping one would double the reversible material at rest.

Reversible storage is a weaker position than a hash. A database dump alone no longer proves that no secret can be recovered from it: with the encryption key too, it can. That is a deliberate trade for projects that need it, and it must not become the default. So:

- **Opt-in, per project, default off.** `projects.exportable_api_key_secrets boolean not null default false`. A project that never opts in keeps exactly the old guarantee. The flag is a plain configuration value, readable by anyone who can read the project; it says nothing about any individual key.
- **Nothing is back-filled.** Opting in does not recover a secret Grant never had. Only keys created or rotated afterwards have a copy; the others are listed by the export with `secret: null`.
- **Project-user keys only.** Account and organization-project keys, which belong to no member the receiver mirrors, never get a copy. CDM imports never write one (the importing system holds the plaintext); a CDM rotate that changes a hash deletes the key's copy.
- **A copy never outlives its hash.** Revoke, delete (soft; hard by the cascade), a CDM replace that deletes or rotates the key, and opting the project out each delete the copy in the same transaction. Opting out deletes every copy of the project and its audit row records how many. The invariant "a copy, when present, decrypts to the secret the current hash verifies" is a unit-tested property, and it is why the copy is written in the same transaction as the hash.

### 2. Who flips it

A new action, `Project:SetExportableApiKeySecrets`, held by Owner and Admin only (the Project Owner and Project Admin groups and the Account Project Owner group), through `setProjectExportableApiKeySecrets` and `PUT /api/projects/{id}/exportable-api-key-secrets`. It is **not** in `ProjectDev`, although Dev holds `Project:Update`: this flag decides whether Grant keeps a credential reversibly, which is not a project setting a developer should be able to change as a side effect of an update. The precedent is `ProjectUser:SetPassword` (ADR 0011 § 3). Every change writes one `SET_EXPORTABLE_API_KEY_SECRETS` row on the project audit log with the old and new value; setting the current value writes nothing. Enabling **fails closed** when `API_KEY_EXPORTABLE_SECRET_ENCRYPTION_KEY` is not configured, so a project never opts in on an installation that cannot encrypt the copy; disabling never needs it. `ApiKeyService` also fails closed: if a project is opted in and the key is missing, creating or rotating a key fails and no key is issued.

### 3. Key management

- **A dedicated key**, `API_KEY_EXPORTABLE_SECRET_ENCRYPTION_KEY`, with its own key-derivation purpose (`grant-platform:api-key-exportable-secret-encryption:v1`, the scrypt salt). It is neither `AUTH_MFA_SECRET_ENCRYPTION_KEY` nor `PROJECT_OAUTH_CONNECTION_ENCRYPTION_KEY`, for the reason ADR 0008 rule 5 gave: to isolate the blast radius of one key from the others. A key derived for one purpose cannot open a secret sealed for another, even under the same material.
- **One primitive, not two.** `apps/api/src/lib/sealed-secret.lib.ts` (`sealSecret`, `unsealSecret`) is the OAuth connection primitive with the purpose as a parameter; the OAuth functions became one-line wrappers with their old salt, byte for byte (`apps/api/src/lib/project-oauth-connection.lib.ts`). There is one encryption path for stored secrets.
- **Resolved at point of use** through `ISecretResolver` (ADR 0004), on every call, never cached, never logged, never part of an error. The material must be identical across replicas.
- **Who and what can decrypt.** The one decrypt path is `ApiKeyExportableSecretService.readForExport` (`apps/api/src/services/api-key-exportable-secrets.service.ts:57`), called only by `ProjectUserCredentialExportService.exportCredentials`, for the members it names, at export time, for a caller holding `ProjectUser:ExportCredentials`. The one repository read of a copy's columns, `findSealedForExport`, has that one caller. A missing key, or a copy that does not decrypt, is a `ConfigurationError` naming the variable and nothing else.
- **Not provided:** rotating or re-wrapping copies when the key changes. As for the OAuth key, a changed value makes existing copies undecryptable; the documentation says so. A holder of the database **and** the key can read every copy of every opted-in project. That is the residual risk of the whole decision (see Consequences).

### 4. The form of an opted-in secret, and bcrypt's 72 bytes

An opted-in project-user key is issued with a secret of **64 random bytes as padded standard base64 (88 characters)**, instead of Grant's usual 32 random bytes of unpadded base64url (43 characters). The receiver's system decodes standard base64; Grant's 43-character form is rejected by a standard decoder (`-`, `_`, no padding), so with the old form the receiver would have to re-encode, and the partner would hold a string that Grant's own `/auth/token` does not accept. With the 88-character form one string works in both. Nothing in Grant rejects it: the secret schema is `min(32)`, the exchange verifies whatever string was hashed, and CDM imports have bcrypt-hashed secrets of this length since BYOK import exists.

**bcrypt reads only the first 72 bytes of its input.** For an 88-character secret the hash covers the first 72 characters (54 bytes, 432 bits) and the last 16 characters are not verified by `POST /auth/token`. This already applies to any imported BYOK secret longer than 72 bytes. This record does **not** change hashing: pre-hashing before bcrypt would change the verification of every existing BYOK secret. The 72 verified bytes are far beyond guessing, so the unverified tail is not a weakness a caller can use; it is stated in the documentation. Every other key keeps the 43-character form.

### 5. The fingerprint

For every project-user key created, rotated or imported from this release on (opted in or not; the plaintext is in hand only then), Grant stores `api_keys.client_secret_fingerprint varchar(64)`: the lowercase hex **SHA-256 of the secret string as issued**, nullable (`null` for a key created before this release and not rotated since). It is read through `User.apiKeyCredentials` (`apiKeyId`, `clientId`, `fingerprint`, `exportable`, `updatedAt`), resolved in the request's project scope and gated by `ProjectUser:ExportCredentials` exactly like `User.passwordCredential` (ADR 0011 § 5): `null`, never an error, for any other caller. The export returns the same fingerprint beside the secret.

It is a change detector and a verifier. A receiver that stores the plaintext compares `sha256(stored secret)` with the fingerprint to see that a key was created or rotated, and to check the secret it was handed. That comparison is the reason for deriving it from the secret as issued rather than from the bcrypt hash (see Alternatives).

A 32- or 64-byte random secret makes the unsalted digest safe against guessing. A secret chosen by an importer is only as strong as the importer made it, and the same digest is stored for imported keys; that is accepted here because the importing system already holds those plaintexts, so the digest tells it nothing new. The digest is readable only through `User.apiKeyCredentials` and the export, both gated by `ProjectUser:ExportCredentials`: `ApiKeyRepository` strips `clientSecretHash` and `clientSecretFingerprint` from every key read (one `withoutSecretColumns` helper), so no REST or GraphQL key read returns either. The hash is read only by the token exchange.

### 6. The export as a second kind

`enum CredentialKind { PASSWORD, API_KEY_SECRET }`. `exportProjectUserCredentials` and `POST /api/users/credentials/export` return, for a request that names `API_KEY_SECRET`, `apiKeySecrets` per member: the member's live (not revoked, not deleted) project-user keys **of that project**, oldest first, each `{ apiKeyId, clientId, fingerprint, secret }`, with `secret` the decrypted plaintext for a key that has a copy and **`null` for a key without one**. `apiKeySecrets` is `null` when the kind was not asked for and `[]` for a member with no key; `password` is `null` when `PASSWORD` was not asked for.

A key without a copy is listed with `secret: null`, not refused: the export is keyed by user, a member without a credential is already listed with `password: null`, and the receiver can then tell "no key" from "no copy" without a second call. The whole-call refusals are unchanged: a non-member in `userIds` fails the call with `NotFoundError` and nothing is read or audited, and the scope, the page cap and `kinds` (never empty) are validated first.

**Same permission, same guards.** `ProjectUser:ExportCredentials` at the transport, project scope only, the authorized-scope guard, membership of every id, one page, `Cache-Control: no-store`. One permission for both kinds follows ADR 0011's reasoning (a new kind, not a second export) and the holder is the same machine. That machine's API key carries the permission as a machine-only scope, attached by a holder of `ProjectUser:SetPassword` ([0014](./0014-api-key-scopes.md)).

### 7. Audit

Each successful call writes, in the one transaction of the export:

- the existing **summary row** on `project_user_credential_audit_logs` (`action = 'export'`, `{ projectId, userCount, credentialCount, kinds }`; `credentialCount` counts the hashes **and** the secrets returned), and
- **one row per exported secret** on `api_key_audit_logs` (`api_key_id` the key, `action = 'export'`, `performedBy` the caller, metadata `{ projectId, userId, kind }`), through the same throwing `IExportAuditLogger.logExport`, which now takes an optional entity id. A key listed with `secret: null` exported nothing and has no row.

The key ids do not fit the summary row (its `metadata` column is `varchar(1000)`, one page of ids is several thousand characters), which is why the per-secret rows live on the API-key audit log, where they also answer "who exported this key". A failed audit write fails the export, so no audit row means no secret returned. A caller that is an API key is attributed to the system user with the key id in the metadata, as for hashes. **No row holds a secret, a hash, a ciphertext or a fingerprint.** The `api_key.*` events keep carrying no secret (omission, not redaction); the export is the only path.

## Why not the alternatives

**Keep only a hash (the status quo) and make the receiver re-encode.** Rejected for the form, not the principle: the other system needs the plaintext that Grant would have to supply, and a re-encoded 43-character secret is a second string for one key that Grant's own exchange does not accept. A receiver that cannot get a secret out of Grant cannot mirror keys created in Grant at all.

**A per-key opt-in** (a flag on each key). Rejected by the request: it makes the decision at the moment a person creates a key, where nobody sees the consequence, and it makes the project's guarantee a property of each key. The project is the unit that decides to run a mirror.

**A flag on `UpdateProjectInput` under `Project:Update`.** No new route or permission, but Dev could flip it, and the deletion of every copy on disable would become a side effect of a generic update. A dedicated action and mutation make "who may do this" a checkable fact (§ 2).

**Reuse `PROJECT_OAUTH_CONNECTION_ENCRYPTION_KEY`** with a distinct purpose salt. One variable fewer across the twenty places it is declared, but rotating that key would then re-wrap two kinds of secret, and a leak of it would expose both. ADR 0008 rejected the same reuse of the MFA key for the same reason.

**Keep the previous secret after a rotation** (`previousSecret`). The receiver already holds it and can move it into its own grace slot; Grant never accepts it; it doubles the reversible material. If a receiver misses a rotation, the fingerprint shows the change and the export returns the current secret.

**A fingerprint of the bcrypt hash**, computed on read like the password fingerprint (the first recommendation in the story brief). It works for every key with no new column and is not a guessing oracle for a weak secret. Rejected at the first gate by the maintainer: a receiver that stores the plaintext cannot compare it with a digest of a hash it never sees, so it could neither detect a change by itself nor verify an exported pair. The fingerprint of the secret as issued costs one nullable column and is stored only for keys whose plaintext Grant held at the time.

**A fingerprint or the secret on `ApiKey`.** Unreachable for the receiver: under the authorized-scope guard an API key authorized in an `OrganizationProject` scope cannot name an `OrganizationProjectUser` scope, so it cannot list a project user's keys, and no query returns `ProjectUserApiKey`. `User.apiKeyCredentials` is the surface the receiver can reach.

**A distinct permission** (`ApiKey:ExportSecret`). Finer, but two standalone grants for one mirror and two gates on one route; ADR 0011 built `kinds` to avoid exactly that.

**Pre-hash before bcrypt** to cover more than 72 bytes. It would change the verification of every BYOK secret already in use (§ 4).

## Consequences

- **The guarantee "an API-key secret can never be read back" is now conditional**, and the documentation says so: it holds for every key of a project that did not opt in, and for every key created before the opt-in. For an opted-in project, the secrets of keys created or rotated since are recoverable by anyone who holds the database and `API_KEY_EXPORTABLE_SECRET_ENCRYPTION_KEY`, and by a caller holding `ProjectUser:ExportCredentials` through the export. The second is the intended path: no default holder, checked at the transport, behind the email and MFA steps of other operator actions, one audit row per call and one per secret. The first is the residual that a deployment manages by where it keeps the key (ADR 0004).
- **Operators** of a deployment that will have opted-in projects must set `API_KEY_EXPORTABLE_SECRET_ENCRYPTION_KEY` (identical across replicas) before the first project opts in; losing or changing it makes the copies undecryptable and the export fails with a configuration error naming the variable. There is no re-wrap.
- **An opt-in project's keys differ in form** (88 characters, standard base64) from every other key; a client that assumed 43 characters would be wrong already for BYOK secrets.
- **bcrypt covers 54 of the 64 bytes** of an opted-in secret; the last 16 characters are not verified by Grant.
- **The receiver's procedure** (watch `api_key.created` / `api_key.rotated`, read `apiKeyCredentials`, export, write into the other system, keep its previous value in that system's grace slot) and the signing proof against the other system are outside Grant. What Grant guarantees, and tests, is that the exported string is the one its own `POST /auth/token` accepts.
- **Open:** re-wrapping copies on key change; a web UI for the flag and the fingerprints; a key-id filter on the export.

## References

- Flag and migration: `packages/@grantjs/database/src/schemas/projects.schema.ts` (`exportableApiKeySecrets`), migration `0094_project_exportable_api_key_secrets.sql`
- Copy table, fingerprint column and RLS: `packages/@grantjs/database/src/schemas/api-key-exportable-secrets.schema.ts`, `0095_api_key_exportable_secrets.sql`
- Primitive: `apps/api/src/lib/sealed-secret.lib.ts`; the OAuth wrappers in `apps/api/src/lib/project-oauth-connection.lib.ts`
- Create, rotate and the four deletion sites: `apps/api/src/services/api-keys.service.ts` (`generateApiKeySecret`, `storeForKey`, `removeForKeys`), `apps/api/src/services/projects.service.ts` (`setExportableApiKeySecrets`)
- Copy service and the one decrypt path: `apps/api/src/services/api-key-exportable-secrets.service.ts`; repository: `apps/api/src/repositories/api-key-exportable-secrets.repository.ts` (`findSealedForExport`)
- Export and audit: `apps/api/src/services/project-user-credential-exports.service.ts`, `apps/api/src/lib/audit/drizzle-audit-logger.ts` (`logExport`)
- Contracts: `packages/@grantjs/schema/src/schema/project-users/types/{credential-kind,project-user-credential-export}.graphql`, `.../users/types/user.graphql` (`apiKeyCredentials`), `apps/api/src/rest/{schemas,openapi}/users.*`
- Tests: `apps/api/tests/e2e/scenarios/api-key-secret-export.e2e.test.ts` (the end-to-end sentinel and the exchange of the exported secret), `apps/api/tests/unit/services/{project-user-credential-exports,api-key-exportable-secrets.service.export,api-keys.service.exportable-secret,api-keys.service.secret-events}.test.ts`
